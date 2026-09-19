import Link from "next/link"
import { useEffect, useState } from "react"
import { Mail, MapPin, MessageCircle, Music2, Phone, Send } from "lucide-react"
import { Logo } from "@/components/logo"
import { getApiUrl } from "@/lib/get-api-url"

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.13 1 2.5 1s2.48 1.12 2.48 2.5ZM.5 8h4V23h-4V8Zm7.5 0h3.8v2.05h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.66 4.78 6.12V23h-4v-7.72c0-1.84-.03-4.2-2.56-4.2-2.56 0-2.96 2-2.96 4.07V23H8V8Z" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  )
}

const serviceLinks = [
  { label: "Shop Ready-Made", href: "/products" },
  { label: "Custom Tailoring", href: "/products?custom=1" },
  { label: "Sell on Hachalu", href: "/sell" },
  { label: "Become a Seller", href: "/auth/signup" },
  { label: "Seller Dashboard", href: "/agent" },
  { label: "Track Order", href: "/orders" },
]

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/products" },
  { label: "Custom Orders", href: "/products?custom=1" },
  { label: "Cart", href: "/cart" },
  { label: "News", href: "/news" },
  { label: "Register", href: "/auth/signup" },
]

interface Settings {
  contactPhone1?: string
  contactPhone2?: string
  contactPhone3?: string
  contactEmail?: string
  socialFacebook?: string
  socialTelegram?: string
  socialWhatsapp?: string
  socialTiktok?: string
  socialLinkedin?: string
  socialInstagram?: string
  socialYoutube?: string
}

export function WebFooter() {
  const [settings, setSettings] = useState<Settings>({})

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

  const phones = [settings.contactPhone1, settings.contactPhone2, settings.contactPhone3].filter(Boolean) as string[]
  const email = settings.contactEmail || "info@dawolife.jebugeneraltrading.com"

  const socials = [
    { label: "Facebook", href: settings.socialFacebook, icon: FacebookIcon },
    { label: "YouTube", href: settings.socialYoutube, icon: YoutubeIcon },
    { label: "Telegram", href: settings.socialTelegram, icon: Send },
    { label: "WhatsApp", href: settings.socialWhatsapp, icon: MessageCircle },
    { label: "TikTok", href: settings.socialTiktok, icon: Music2 },
    { label: "LinkedIn", href: settings.socialLinkedin, icon: LinkedinIcon },
    { label: "Instagram", href: settings.socialInstagram, icon: InstagramIcon },
  ].filter((s) => s.href)

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo dark />
            <p className="mt-4 text-sm leading-relaxed text-secondary-foreground/70">
              Hachalu Protocol is Ethiopia&apos;s trusted marketplace for ready-made
              garments and custom tailoring. We connect buyers, sellers, and master
              tailors — from curated looks and quality fabrics to fully bespoke,
              made-to-measure pieces.
            </p>
            {socials.length > 0 && (
              <div className="mt-5 flex gap-3">
                {socials.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-secondary-foreground/70 transition-colors hover:border-primary hover:bg-primary hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Services</h3>
            <ul className="mt-4 space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Quick Links</h3>
            <ul className="mt-4 space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-secondary-foreground/70 transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Contact</h3>
            <ul className="mt-4 space-y-3 text-sm text-secondary-foreground/70">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <a href={`mailto:${email}`} className="transition-colors hover:text-primary">
                  {email}
                </a>
              </li>
              {phones.map((phone) => (
                <li key={phone} className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="transition-colors hover:text-primary">
                    {phone}
                  </a>
                </li>
              ))}
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Addis Ababa, Ethiopia</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-secondary-foreground/50 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Hachalu Protocol. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/" className="transition-colors hover:text-primary">
              Privacy Policy
            </Link>
            <Link href="/" className="transition-colors hover:text-primary">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
