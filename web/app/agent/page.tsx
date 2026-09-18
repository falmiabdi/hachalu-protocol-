"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingBag, Boxes, CreditCard, Plus } from "lucide-react"
import { useAuth } from "@/components/auth/auth-guard"
import { fetchMyCommissions, fetchMyOrders, fetchSellerProducts, formatMoney, type Order, type Product } from "@/lib/hachalu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function AgentDashboardPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [commissions, setCommissions] = useState<Awaited<ReturnType<typeof fetchMyCommissions>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([fetchSellerProducts(), fetchMyOrders(), fetchMyCommissions()])
      .then(([p, o, c]) => {
        setProducts(p)
        setOrders(o.filter((ord) => ord.sellerId === user.id))
        setCommissions(c)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const pendingCommissions = commissions.filter((c) => c.status === "Pending").reduce((s, c) => s + c.amount, 0)

  const cards = [
    { label: "My products", value: products.length, href: "/agent/products", icon: ShoppingBag },
    { label: "Order count", value: orders.reduce((s, o) => s + (o.items || []).reduce((x, i) => x + i.quantity, 0), 0), href: "/agent/orders", icon: Boxes },
    { label: "Commissions", value: formatMoney(pendingCommissions), href: "/agent/commissions", icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-secondary">Welcome, {user?.name?.split(" ")[0] || "Seller"}</h1>
          <p className="text-sm text-muted-foreground">Manage your products, orders and earnings.</p>
        </div>
        <Link href="/sell" className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
          <Plus className="h-4 w-4" /> List product
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-orange-300 hover:shadow-sm">
            <c.icon className="h-4 w-4 text-orange-500" />
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-500">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">My products</h2>
            <Link href="/agent/products" className="text-xs font-medium text-orange-600 hover:underline">View all</Link>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : products.length === 0 ? (
            <p className="text-sm text-slate-400">No products yet.</p>
          ) : (
            <div className="space-y-2">
              {products.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <p className="line-clamp-1 text-sm text-slate-700">{p.name}</p>
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    p.status === "Approved" ? "bg-green-100 text-green-700" : p.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                  )}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Recent orders</h2>
            <Link href="/agent/orders" className="text-xs font-medium text-orange-600 hover:underline">View all</Link>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : orders.length === 0 ? (
            <p className="text-sm text-slate-400">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">{o.orderNumber}</p>
                  <p className="text-sm font-bold text-slate-900">{formatMoney(o.totalPrice)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}