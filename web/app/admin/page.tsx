"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Boxes,
  CreditCard,
  Wallet,
  Hammer,
  Package,
  ShoppingBag,
} from "lucide-react"
import { fetchAdminOverview, formatMoney } from "@/lib/hachalu"
import { Skeleton } from "@/components/ui/skeleton"

const ADMIN_SECTIONS = [
  { href: "/admin/products", label: "Products", icon: ShoppingBag, desc: "Review & approve listings" },
  { href: "/admin/orders", label: "Orders", icon: Boxes, desc: "Manage order flow" },
  { href: "/admin/production", label: "Production", icon: Hammer, desc: "Track tailoring jobs" },
  { href: "/admin/workers", label: "Workers", icon: Hammer, desc: "Tailors on the floor" },
  { href: "/admin/machines", label: "Machines", icon: Package, desc: "Machines & maintenance" },
  { href: "/admin/inventory", label: "Inventory", icon: Package, desc: "Materials & stock" },
  { href: "/admin/commissions", label: "Commissions", icon: CreditCard, desc: "Seller earnings" },
]

export default function AdminDashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminOverview>> | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setData(await fetchAdminOverview())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const counts = data?.counts
  const stats = data?.paymentStats

  const statsRows = [
    { label: "Products", value: counts?.products ?? 0, sub: `${counts?.pendingProducts ?? 0} pending review`, href: "/admin/products" },
    { label: "Orders", value: counts?.orders ?? 0, sub: "All orders", href: "/admin/orders" },
    { label: "Sellers", value: counts?.sellers ?? 0, sub: `${counts?.pendingSellers ?? 0} pending`, href: "/admin/users" },
    { label: "Workers", value: counts?.workers ?? 0, sub: "Tailoring staff", href: "/admin/workers" },
    { label: "Revenue", value: formatMoney(stats?.totalRevenue ?? 0), sub: `${stats?.completedCount ?? 0} completed payments`, href: "/admin/commissions" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-secondary">Hachalu Overview</h1>
        <p className="text-sm text-muted-foreground">Shop, production and commission summary.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statsRows.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm"
          >
            <p className="text-xs font-medium text-slate-500">{row.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{row.value}</p>
            <p className="mt-1 text-xs text-slate-400">{row.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Quick actions</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ADMIN_SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-orange-300 hover:bg-orange-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">{s.label}</span>
                  <span className="block truncate text-xs text-slate-400">{s.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-800">Recent orders</h2>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : data && data.recentOrders.length > 0 ? (
            <div className="space-y-2">
              {data.recentOrders.map((o) => (
                <Link key={o.id} href="/admin/orders" className="flex items-center justify-between rounded-lg p-2 transition hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{o.orderNumber}</p>
                    <p className="text-xs text-slate-400">{o.customer?.username || ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatMoney(o.totalPrice)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No orders yet.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-orange-600" />
          <h2 className="text-sm font-bold text-slate-800">Payment summary</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-xs text-green-700">Completed</p>
            <p className="text-lg font-bold text-green-800">{stats?.completedCount ?? 0}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-xs text-amber-700">Pending</p>
            <p className="text-lg font-bold text-amber-800">{stats?.pendingCount ?? 0}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3">
            <p className="text-xs text-red-700">Failed</p>
            <p className="text-lg font-bold text-red-800">{stats?.failedCount ?? 0}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">6% default commission rate applies to completed orders.</p>
      </div>
    </div>
  )
}