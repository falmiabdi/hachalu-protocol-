"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Boxes } from "lucide-react"
import {
  fetchAdminOrders,
  formatDate,
  formatMoney,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from "@/lib/hachalu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const FLOW: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PendingPayment: ["Paid", "Cancelled"],
  Paid: ["MeasurementPending", "Assigned", "InProduction", "Cancelled"],
  MeasurementPending: ["MeasurementConfirmed", "Cancelled"],
  MeasurementConfirmed: ["Assigned", "Cancelled"],
  Assigned: ["InProduction", "Cancelled"],
  InProduction: ["Packed", "Cancelled"],
  Packed: ["Delivered"],
  Delivered: ["Completed"],
}

const STATUS_FILTERS = ["", "PendingPayment", "Paid", "InProduction", "Packed", "Delivered", "Completed", "Cancelled"]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminOrders({ status: filter || undefined, limit: 100 })
      setOrders(data.orders)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const advance = async (order: Order, next: OrderStatus) => {
    setBusy(order.id)
    try {
      await updateOrderStatus(order.id, next)
      toast.success(`${order.orderNumber} → ${ORDER_STATUS_LABELS[next]}`)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to update")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-secondary">Orders</h1>
          <p className="text-sm text-muted-foreground">Monitor and advance every order.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f || "all"}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                filter === f ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200 text-slate-600 hover:border-orange-300"
              )}
            >
              {f === "" ? "All" : ORDER_STATUS_LABELS[f] || f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 p-14 text-center">
          <Boxes className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-600">No orders</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const options = FLOW[order.status] || []
            return (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                        ORDER_STATUS_COLORS[order.status] || "bg-slate-100 text-slate-600"
                      )}
                    >
                      {ORDER_STATUS_LABELS[order.status] || order.status}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{order.orderNumber}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                      {order.type === "custom" ? "Custom" : "Ready-made"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{order.customer?.username || "—"}</span>
                    <span>{formatDate(order.createdAt)}</span>
                    <span className="text-sm font-bold text-slate-900">{formatMoney(order.totalPrice)}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  {options.map((next) => (
                    <Button
                      key={next}
                      size="sm"
                      variant="outline"
                      onClick={() => advance(order, next)}
                      disabled={busy === order.id}
                    >
                      {busy === order.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      → {ORDER_STATUS_LABELS[next]}
                    </Button>
                  ))}
                  {options.length === 0 && <span className="text-xs text-slate-400">No further transitions</span>}
                  <Link href={`/orders?id=${order.id}`} className="ml-auto text-xs font-medium text-orange-600 hover:underline">
                    View
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}