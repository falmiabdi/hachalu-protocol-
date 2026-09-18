"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Boxes } from "lucide-react"
import { useAuth } from "@/components/auth/auth-guard"
import { fetchMyOrders, formatDate, formatMoney, mediaUrl, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, type Order } from "@/lib/hachalu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function AgentOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const all = await fetchMyOrders()
      setOrders(all.filter((o) => o.sellerId === user.id))
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-secondary">
          <Boxes className="h-5 w-5 text-orange-600" /> My orders
        </h1>
        <p className="text-sm text-muted-foreground">Orders placed against your products.</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          No orders for your products yet.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", ORDER_STATUS_COLORS[o.status] || "bg-slate-100 text-slate-600")}>
                    {ORDER_STATUS_LABELS[o.status] || o.status}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{o.orderNumber}</span>
                  <span className="text-xs text-slate-400">{o.type === "custom" ? "Custom" : "Ready-made"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {(o.items || []).slice(0, 3).map((item, i) => {
                      const url = item.product?.images?.[0]?.url
                      return url ? (
                        <div key={item.id || i} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-slate-100">
                          <Image src={mediaUrl(url)} alt="" fill sizes="32px" className="object-cover" unoptimized />
                        </div>
                      ) : null
                    })}
                  </div>
                  <span className="text-sm font-extrabold text-slate-900">{formatMoney(o.totalPrice)}</span>
                  <span className="text-xs text-slate-400">{formatDate(o.createdAt)}</span>
                </div>
              </div>
              <div className="mt-2 border-t border-slate-100 pt-2">
                <p className="line-clamp-1 text-xs text-slate-500">
                  Customer: {o.customer?.username || o.customer?.email || "—"} ·{" "}
                  {(o.items || []).map((i) => i.product?.name).filter(Boolean).join(", ") || "Items"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}