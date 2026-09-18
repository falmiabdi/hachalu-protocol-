import { PrismaClient } from '@prisma/client'

function databaseUrl(): string {
  const url = process.env.DATABASE_URL || ''
  try {
    const urlObj = new URL(url)
    urlObj.searchParams.set('connect_timeout', '30')
    urlObj.searchParams.set('pool_timeout', '30')
    if (urlObj.hostname.includes('-pooler')) {
      if (!urlObj.searchParams.has('pgbouncer')) {
        urlObj.searchParams.set('pgbouncer', 'true')
      }
      if (!urlObj.searchParams.has('connection_limit')) {
        urlObj.searchParams.set('connection_limit', '10')
      }
    }
    return urlObj.toString()
  } catch {
    if (url.includes('-pooler')) {
      const sep = url.includes('?') ? '&' : '?'
      const pgbouncer = url.includes('pgbouncer=true') ? '' : `${sep}pgbouncer=true`
      const limit = `${url.includes('?') || pgbouncer ? '&' : '?'}connection_limit=10`
      return `${url}${pgbouncer || ''}${limit}&connect_timeout=30&pool_timeout=30`
    }
    const sep = url.includes('?') ? '&' : '?'
    return url.includes('?') ? `${url}${sep}connect_timeout=30&pool_timeout=30` : `${url}?connect_timeout=30&pool_timeout=30`
  }
}

export const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl() } },
  transactionOptions: { maxWait: 10000, timeout: 20000 },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

let _dbAvailable = false

export function isDbAvailable(): boolean {
  return _dbAvailable
}

function isRetryableConnectionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /server has closed the connection|connection.*closed|can't reach database server|timed out fetching a new connection|connection pool|P1001|P1002|P1017/i.test(message)
}

const RETRY_BACKOFFS_MS = [500, 1000, 2000, 4000, 8000, 15000]


export async function withPrismaRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (const delay of RETRY_BACKOFFS_MS) {
    try {
      const result = await operation()
      _dbAvailable = true
      return result
    } catch (error) {
      lastError = error
      if (!isRetryableConnectionError(error)) throw error
      _dbAvailable = false
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  _dbAvailable = false
  throw lastError
}

const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000
let keepAliveStarted = false


export function startKeepAlive() {
  if (keepAliveStarted) return
  keepAliveStarted = true
  const timer = setInterval(() => {
    prisma.$queryRaw`SELECT 1`.then(() => {
      _dbAvailable = true
    }).catch(() => {
      _dbAvailable = false
    })
  }, KEEPALIVE_INTERVAL_MS)
  timer.unref()
}
