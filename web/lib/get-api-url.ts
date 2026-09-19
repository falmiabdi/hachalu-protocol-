'use client'

let cachedUrl: string | null = null
let patched = false
let isNativePlatform = false
let nativeResolvePromise: Promise<string> | null = null
let rawFetch: typeof fetch | undefined
let lastResolvedAt = 0

const DEFAULT_API_URL = 'http://localhost:4000'
const ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:4000'
const GENYMOTION_API_URL = 'http://10.0.3.2:4000'
const PROBE_TIMEOUT_MS = 2500
const PROBE_ATTEMPTS = 3
const PROBE_BACKOFF_MS = 600
const RESOLUTION_TTL_MS = 45_000

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function defaultApiUrl(): string {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL)
}

function getConfiguredFallbackUrls(): string[] {
  const configured = process.env.NEXT_PUBLIC_API_FALLBACK_URLS
  if (!configured) return []
  return configured
    .split(',')
    .map((entry) => normalizeBaseUrl(entry.trim()))
    .filter(Boolean)
}

function detectNativePlatform(): string | null {
  try {
    const Capacitor = require('@capacitor/core').Capacitor
    return Capacitor.getPlatform()
  } catch {
    return null
  }
}

function isDetectableNative(): boolean {
  try {
    const Capacitor = require('@capacitor/core').Capacitor
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

function nativeCandidates(): string[] {
  const candidates = new Set<string>()
  const platform = detectNativePlatform()
  const envUrl = process.env.NEXT_PUBLIC_API_URL

  if (envUrl) candidates.add(normalizeBaseUrl(envUrl))
  for (const fallback of getConfiguredFallbackUrls()) {
    candidates.add(fallback)
  }

  if (platform === 'android') {
    candidates.add(ANDROID_EMULATOR_API_URL)
    candidates.add(GENYMOTION_API_URL)
  }

  candidates.add(DEFAULT_API_URL)
  return [...candidates]
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function probeUrl(url: string): Promise<string | null> {
  const baseUrl = normalizeBaseUrl(url)
  const healthUrl = `${baseUrl}/api/health`
  const fetcher = rawFetch || (typeof window !== 'undefined' ? window.fetch : undefined) || fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)

  try {
    const response = await fetcher(healthUrl, {
      signal: controller.signal,
      cache: 'no-store',
    })
    return response.ok ? baseUrl : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function probeCandidatesOnce(candidates: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = 0
    let winnerFound = false

    for (const candidate of candidates) {
      probeUrl(candidate).then((resolved) => {
        settled += 1
        if (resolved && !winnerFound) {
          winnerFound = true
          resolve(resolved)
          return
        }

        if (settled === candidates.length && !winnerFound) {
          resolve(null)
        }
      })
    }
  })
}

async function resolveCandidateWithRetries(candidates: string[], attempts = PROBE_ATTEMPTS): Promise<string | null> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const winner = await probeCandidatesOnce(candidates)
    if (winner) return winner
    if (attempt < attempts) {
      const delay = PROBE_BACKOFF_MS * attempt
      await sleep(delay)
    }
  }
  return null
}

function rewriteLocalApiOrigin(url: string, baseUrl: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  const origins = [
    DEFAULT_API_URL,
    ANDROID_EMULATOR_API_URL,
    GENYMOTION_API_URL,
    defaultApiUrl(),
    ...getConfiguredFallbackUrls(),
  ]

  for (const origin of origins) {
    const normalizedOrigin = normalizeBaseUrl(origin)
    if (normalizedOrigin && url.startsWith(normalizedOrigin)) {
      return `${normalizedBase}${url.slice(normalizedOrigin.length)}`
    }
  }

  return url
}

type ResolveOptions = {
  force?: boolean
  attempts?: number
}

export async function resolveNativeApiUrl(options: ResolveOptions = {}): Promise<string> {
  const { force = false, attempts = PROBE_ATTEMPTS } = options

  if (!force && cachedUrl && Date.now() - lastResolvedAt < RESOLUTION_TTL_MS) {
    return cachedUrl
  }

  if (nativeResolvePromise && !force) return nativeResolvePromise

  nativeResolvePromise = (async () => {
    const candidates = nativeCandidates()
    const winner = await resolveCandidateWithRetries(candidates, attempts)

    if (winner) {
      cachedUrl = winner
      lastResolvedAt = Date.now()
      return cachedUrl
    }

    const fallback = candidates[0] || defaultApiUrl()
    cachedUrl = fallback
    lastResolvedAt = Date.now()
    console.warn(
      `[API] No healthy native endpoint detected after ${attempts} probe attempts. Falling back to ${fallback}.`
    )
    return fallback
  })().finally(() => {
    nativeResolvePromise = null
  })

  return nativeResolvePromise
}

export function getApiUrl(): string {
  if (cachedUrl) return cachedUrl

  if (isDetectableNative()) {
    isNativePlatform = true
    cachedUrl = defaultApiUrl()
    resolveNativeApiUrl().catch((error) => {
      console.warn('[API] Native endpoint probing failed:', error)
    })
    return cachedUrl
  }

  cachedUrl = defaultApiUrl()
  return cachedUrl
}

export async function getApiUrlAsync(): Promise<string> {
  if (cachedUrl && Date.now() - lastResolvedAt < RESOLUTION_TTL_MS) return cachedUrl
  if (isDetectableNative()) {
    isNativePlatform = true
    return resolveNativeApiUrl()
  }
  return getApiUrl()
}

function toWsBaseUrl(baseUrl: string): string {
  return normalizeBaseUrl(baseUrl).replace(/^http/i, 'ws')
}

export function getWsUrl(path = '/ws'): string {
  const override = process.env.NEXT_PUBLIC_WS_URL
  const wsBase = override ? normalizeBaseUrl(override) : toWsBaseUrl(getApiUrl())
  return `${wsBase}${path}`
}

export async function getWsUrlAsync(path = '/ws'): Promise<string> {
  const override = process.env.NEXT_PUBLIC_WS_URL
  if (override) {
    return `${normalizeBaseUrl(override)}${path}`
  }
  const apiBase = await getApiUrlAsync()
  return `${toWsBaseUrl(apiBase)}${path}`
}

export function getImageUrl(url: string | null | undefined): string {
  if (!url) return '/placeholder.svg'
  return rewriteLocalApiOrigin(url, getApiUrl())
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /failed to fetch|networkerror|network request failed/i.test(error.message)
}

export function patchFetchForCapacitor() {
  if (patched || typeof window === 'undefined') return

  try {
    const Capacitor = require('@capacitor/core').Capacitor
    isNativePlatform = Capacitor.isNativePlatform()
  } catch {
    return
  }

  if (!isNativePlatform) return

  const originalFetch = window.fetch
  rawFetch = originalFetch.bind(window)

  getApiUrl()

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const originalInput = input
    let url: string

    if (input instanceof Request) {
      url = input.url
    } else if (typeof input === 'string') {
      url = input
    } else {
      url = input.toString()
    }

    const baseUrl = await resolveNativeApiUrl()
    const rewrittenUrl = rewriteLocalApiOrigin(url, baseUrl)
    const finalInput =
      rewrittenUrl !== url
        ? input instanceof Request
          ? new Request(rewrittenUrl, input)
          : rewrittenUrl
        : input

    try {
      return await originalFetch.call(window, finalInput, init)
    } catch (error) {
      if (!isRetryableNetworkError(error) || originalInput instanceof Request) {
        throw error
      }

      const refreshedBase = await resolveNativeApiUrl({ force: true, attempts: PROBE_ATTEMPTS + 1 })
      const retryUrl = rewriteLocalApiOrigin(url, refreshedBase)

      if (retryUrl === url) {
        throw error
      }

      return originalFetch.call(window, retryUrl, init)
    }
  }

  patched = true
}

export function isNative(): boolean {
  return isNativePlatform
}

patchFetchForCapacitor()
