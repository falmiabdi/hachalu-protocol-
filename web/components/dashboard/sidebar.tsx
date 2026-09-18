"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/components/auth/auth-guard"
import {
  LayoutDashboard,
  Scissors,
  ShoppingBag,
  Boxes,
  Truck,
  User,
  CreditCard,
  Settings,
  LogOut,
  Hammer,
  Users,
  Home,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: ShoppingBag },
  { href: "/admin/orders", label: "Orders", icon: Boxes },
  { href: "/admin/production", label: "Production", icon: Scissors },
  { href: "/admin/workers", label: "Workers", icon: Hammer },
  { href: "/admin/machines", label: "Machines", icon: Truck },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/commissions", label: "Commissions", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

const agentNav = [
  { href: "/agent", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agent/products", label: "My Products", icon: ShoppingBag },
  { href: "/sell", label: "List Product", icon: Scissors },
  { href: "/agent/orders", label: "Orders", icon: Boxes },
  { href: "/agent/commissions", label: "Commissions", icon: CreditCard },
  { href: "/agent/settings", label: "Settings", icon: Settings },
]

interface SidebarProps {
  role: "agent" | "admin" | "owner"
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const nav = role === "admin" ? adminNav : agentNav

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return pathname === "/"
      if (pathname === path) return true
      if (pathname.startsWith(`${path}/`)) return true
      return false
    },
    [pathname],
  )

  const sidebarContent = (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900 text-white">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500">
            <Scissors className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            Hachalu<span className="text-orange-400">Protocol</span>
          </span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-6 py-3">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {role} portal
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {nav.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "mb-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          onClick={() => {
            logout()
            router.push("/auth/login")
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-red-900/30 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden lg:flex lg:h-screen lg:w-64 lg:flex-shrink-0">
        {sidebarContent}
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>
    </>
  )
}
