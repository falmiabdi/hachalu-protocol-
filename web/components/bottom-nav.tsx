"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Home, ShoppingBag, Package, Tag, User } from "lucide-react"
import { useAuth } from "@/components/auth/auth-guard"
import { useCart } from "@/lib/cart"
import { cn } from "@/lib/utils"

const SCROLL_THRESHOLD = 10
const HIDE_ANIMATION = { duration: 0.25, ease: "easeInOut" as const }


const HIDDEN_PATHS = ["/admin", "/agent", "/auth", "/listings"]

interface NavItem {
  label: string
  icon: typeof Home
  href?: string
  action?: () => void
  match?: (pathname: string) => boolean
  badge?: number
}

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { count } = useCart()
  const [navHidden, setNavHidden] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  const hidden = HIDDEN_PATHS.some((path) => pathname.startsWith(path))

  
  useEffect(() => {
    lastScrollY.current = window.scrollY
    setNavHidden(false)
  }, [pathname])

  
  useEffect(() => {
    if (hidden || typeof window === "undefined") return
    lastScrollY.current = window.scrollY

    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - lastScrollY.current

        if (y < SCROLL_THRESHOLD) {
          setNavHidden(false)
        } else if (delta > SCROLL_THRESHOLD) {
          setNavHidden(true)
        } else if (delta < -SCROLL_THRESHOLD) {
          setNavHidden(false)
        }

        lastScrollY.current = y
        ticking.current = false
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [hidden])

  if (hidden) return null

  const profileHref = !user
    ? "/auth/login"
    : user.role === "admin"
      ? "/admin"
      : user.role === "agent" || user.role === "owner" || user.role === "worker"
        ? "/agent"
        : "/orders"

  const items: NavItem[] = [
    { label: "Home", href: "/", icon: Home, match: (p) => p === "/" },
    { label: "Shop", href: "/products", icon: Tag, match: (p) => p.startsWith("/products") },
    { label: "Cart", href: "/cart", icon: ShoppingBag, match: (p) => p.startsWith("/cart") || p.startsWith("/checkout"), badge: count },
    {
      label: "Orders",
      href: "/orders",
      icon: Package,
      match: (p) => p.startsWith("/orders"),
    },
    { label: "Profile", href: profileHref, icon: User, match: (p) => p.startsWith("/verify") || p.startsWith("/admin") || p.startsWith("/agent") || p.startsWith("/account") || p.startsWith("/orders") },
  ]

  return (
    <motion.nav
      initial={false}
      animate={{ y: navHidden ? "100%" : "0%" }}
      transition={HIDE_ANIMATION}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.06)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Bottom navigation"
    >
      <div className="flex h-16 items-stretch">
        {items.map((item) => {
          const active = item.match ? item.match(pathname) : false
          const Icon = item.icon

          if (item.action) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
                aria-label={item.label}
              >
                <span className="relative">
                  <Icon
                    className={cn("h-6 w-6 transition-colors", active ? "text-primary" : "text-muted-foreground")}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px] transition-colors",
                    active ? "font-semibold text-primary" : "font-medium text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href || "/"}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5"
              aria-label={item.label}
            >
              <span className="relative">
                <Icon
                  className={cn("h-6 w-6 transition-colors", active ? "text-primary" : "text-muted-foreground")}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  active ? "font-semibold text-primary" : "font-medium text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </motion.nav>
  )
}
