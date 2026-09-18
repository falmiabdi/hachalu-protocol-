"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, Plus, X, User, ChevronDown, Newspaper, Mail, Phone, ShoppingBag } from "lucide-react"
import { Logo } from "@/components/logo"
import Image from "next/image"
import { LanguageDropdown } from "@/components/language-dropdown"
import { useI18n } from "@/lib/i18n"
import { useAuth } from "@/components/auth/auth-guard"
import { useCart } from "@/lib/cart"
import { getApiUrl } from "@/lib/get-api-url"

interface SocialSettings {
  contactPhone1?: string
  contactEmail?: string
  socialFacebook?: string
  socialTelegram?: string
  socialWhatsapp?: string
  socialTiktok?: string
  socialLinkedin?: string
  socialInstagram?: string
  socialYoutube?: string
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  )
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.94 1.04a11.1 11.1 0 1 0 6.78 19.93c4-1.94 5.32-6.66 5.32-6.66-.3 5.46-4.07 9.95-9.3 11.83C8.82 27.74 2.7 24.25 1.7 18.4a11.1 11.1 0 1 1 10.24-17.36Zm6.62 19.6c.58-1.93 3.37-19.7 3.37-19.7L16.39.03c-5.06 2.45-16.63 8.02-16.63 8.02-.99.42-.97 1.5-.97 1.5.02.04 1.04.35 1.04.35 7.2 2.27 8.5 2.55 8.72 2.24.14-.18.18-.28.5.13 1.7 2.2 4.93 6.33 4.93 6.33.23.42-.4.87-.4.87Z" />
    </svg>
  )
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07a8.09 8.09 0 0 1-2.38-1.47 8.94 8.94 0 0 1-1.65-2.05c-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.89 1.22 3.09.15.2 2.11 3.22 5.11 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35M12.05 21.8h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.22-3.76.99 1-3.66-.24-.37a9.87 9.87 0 1 1 8.42 4.64m0-20.3A11.9 11.9 0 0 0 1.8 16.78.9.9 0 0 0 1 17.85l-1.25 4.63a.6.6 0 0 0 .74.74l4.63-1.25a.9.9 0 0 0 .28-.18A11.9 11.9 0 1 0 12.05 1.5Z" />
    </svg>
  )
}

function TiktokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 1 1-2.31-2.84v-3.5a6.37 6.37 0 1 0 5.76 6.34V8.93a8.22 8.22 0 0 0 4.77 1.52V6.9a4.8 4.8 0 0 1-1-.21Z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.71 3.71 0 0 1-1.38-.9 3.71 3.71 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.47 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0Zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.15A3.99 3.99 0 1 1 16 12a4 4 0 0 1-4 3.99Zm6.4-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44Z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.32-.02-3.03-1.85-3.03-1.85 0-2.13 1.44-2.13 2.93v5.67H9.35V9h3.42v1.56h.05a3.75 3.75 0 0 1 3.38-1.86c3.62 0 4.29 2.38 4.29 5.46v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm1.77 13.02H3.56V9H7.1v11.45ZM22.22 0H1.77A1.77 1.77 0 0 0 0 1.77v20.46A1.77 1.77 0 0 0 1.77 24h20.45A1.77 1.77 0 0 0 24 22.23V1.77A1.77 1.77 0 0 0 22.22 0Z" />
    </svg>
  )
}


const brandColors: Record<string, string> = {
  Facebook: "#1877F2",
  YouTube: "#FF0000",
  Telegram: "#26A5E4",
  WhatsApp: "#25D366",
  TikTok: "#000000",
  Instagram: "#E4405F",
  LinkedIn: "#0A66C2",
}

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/products" },
  { label: "Custom", href: "/products?custom=1" },
  { label: "Orders", href: "/orders" },
  { label: "Sell", href: "/sell" },
]

const moreLinks = [
  { label: "Cart", href: "/cart", icon: ShoppingBag },
  { label: "Sell on Hachalu", href: "/sell", icon: Plus },
  { label: "Login", href: "/auth/login", icon: User },
  { label: "Register", href: "/auth/signup", icon: User },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [settings, setSettings] = useState<SocialSettings>({})
  const { t } = useI18n()
  const { user } = useAuth()
  const { count } = useCart()
  const isAuth = !!user
  const photoUrl = user?.profilePhoto || null

  const profileTarget =
    user?.role === "admin"
      ? "/admin"
      : user?.role === "agent" || user?.role === "owner" || user?.role === "worker"
        ? "/agent"
        : "/orders"

  useEffect(() => {
    let active = true
    fetch(`${getApiUrl()}/api/settings`)
      .then((r) => r.json())
      .then((data) => {
        if (active && data) setSettings(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const contactEmail = settings.contactEmail || "hello@hachaluprotocol.com"
  const contactPhone = settings.contactPhone1 || ""

  const topSocials = [
    { key: "socialYoutube", label: "YouTube" },
    { key: "socialFacebook", label: "Facebook" },
    { key: "socialTelegram", label: "Telegram" },
    { key: "socialWhatsapp", label: "WhatsApp" },
    { key: "socialTiktok", label: "TikTok" },
    { key: "socialInstagram", label: "Instagram" },
    { key: "socialLinkedin", label: "LinkedIn" },
  ]
    .filter((s) => (settings as any)[s.key])
    .map((s) => ({ ...s, href: (settings as any)[s.key] as string }))

  const topSocialIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    socialFacebook: FacebookIcon,
    socialYoutube: YoutubeIcon,
    socialTelegram: TelegramIcon,
    socialWhatsapp: WhatsappIcon,
    socialTiktok: TiktokIcon,
    socialInstagram: InstagramIcon,
    socialLinkedin: LinkedinIcon,
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="hidden items-center justify-between border-b border-secondary/10 bg-secondary px-6 py-1.5 text-[11px] leading-none text-secondary-foreground/80 md:flex">
        <a
          href={`mailto:${contactEmail}`}
          className="flex items-center gap-1 whitespace-nowrap transition-colors hover:text-primary"
        >
          <Mail className="h-3 w-3" />
          <span>{contactEmail}</span>
        </a>
        <div className="flex items-center gap-3">
          {topSocials.map(({ key, label, href }) => {
            const Icon = topSocialIcon[key] || Newspaper
            const color = brandColors[label] || "#ffffff"
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: color, color: "#fff" }}
              >
                <Icon className="h-3 w-3" />
              </a>
            )
          })}
          {contactPhone && (
            <a
              href={`tel:${contactPhone.replace(/[^0-9+]/g, "")}`}
              aria-label={`Call ${contactPhone}`}
              className="call-btn items-center gap-1 whitespace-nowrap rounded-full bg-green-600 px-2 py-1 text-[10px] font-bold leading-none text-white no-underline transition-colors hover:bg-green-700"
            >
              <Phone className="call-shake h-3 w-3" />
              <span>{contactPhone}</span>
            </a>
          )}
          <span className="text-secondary-foreground/30">|</span>
          <LanguageDropdown className="hidden sm:block" />
          {isAuth ? (
            <Link href={profileTarget} className="flex items-center gap-2 hover:opacity-80 transition">
              {photoUrl ? (
                <div className="h-5 w-5 rounded-full overflow-hidden bg-primary/10 ring-2 ring-primary/30">
                  <Image src={photoUrl} alt={user.name || "Profile"} width={20} height={20} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[9px] ring-2 ring-primary/30">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="max-w-[140px] truncate text-[11px] font-semibold">{user.name || user.email}</span>
            </Link>
          ) : (
            <>
              <Link href="/auth/login" className="hover:text-primary">{t('login')}</Link>
              <span className="text-secondary-foreground/30">|</span>
              <Link href="/auth/signup" className="hover:text-primary">{t('register')}</Link>
            </>
          )}
        </div>
      </div>

      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
            <div className="relative">
              <button
                className="flex items-center gap-1 text-sm font-medium text-foreground/70 transition-colors hover:text-primary"
                onClick={() => setMoreOpen((o) => !o)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
              >
                More
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMoreOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl"
                  >
                    {moreLinks.map((link) => {
                      const Icon = link.icon
                      return (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-muted"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {link.label}
                        </Link>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground transition hover:bg-muted"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
            {isAuth && (
              <Link href={profileTarget} className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition text-sm font-medium text-primary">
                {photoUrl ? (
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-primary/10">
                    <Image src={photoUrl} alt={user.name || "Profile"} width={28} height={28} className="h-full w-full object-contain" />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs">
                    {(user.name || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="line-clamp-1">{user.name || user.email}</span>
              </Link>
            )}
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-foreground lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-border bg-card px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-muted min-h-[44px] flex items-center"
                >
                  {link.label}
                </Link>
              ))}
              {moreLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-muted min-h-[44px] flex items-center"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-border pt-2 flex flex-col gap-1">
                {isAuth ? (
                  <Link
                    href={profileTarget}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-sm font-semibold text-primary hover:bg-muted min-h-[44px] flex items-center gap-2"
                  >
                    {photoUrl ? (
                      <div className="h-6 w-6 rounded-full overflow-hidden bg-primary/10">
                        <Image src={photoUrl} alt={user.name || "Profile"} width={24} height={24} className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center font-bold text-[10px]">
                        {(user.name || user.email || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    {t('dashboard')}
                  </Link>
                ) : (
                  <>
                    <Link
href="/auth/login"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 text-sm font-semibold text-foreground/80 hover:bg-muted min-h-[44px] flex items-center"
                    >
                    {t('login')}
                    </Link>
                    <Link
href="/auth/signup"
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-3 py-3 text-sm font-semibold text-primary hover:bg-muted min-h-[44px] flex items-center"
                    >
                      {t('register')}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
