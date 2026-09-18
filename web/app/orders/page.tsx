"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Boxes, CircleCheck, Package, ReceiptText } from "lucide-react"
import { AuthGuard, useAuth } from "@/components/auth/auth-guard"
import { SiteHeader } from "@/components/site-header"
import { WebFooter } from "@/components/site/web-footer"
import {
  cancelOrder,
  fetchMyOrders,
  fetchOrder,
  formatDate,
  formatMoney,
  mediaUrl,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  type Order,
  type OrderItem,
} from "@/lib/hachalu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const STATUS_STEPS = [
  "PendingPayment",
  "Paid",
  "MeasurementPending",
  "MeasurementConfirmed",
  "Assigned",
  "InProduction",
  "Packed",
  "Delivered",
  "Completed",
]

function StatusTimeline({ order }: { order: Order }) {
  const steps = order.type === "custom" ? STATUS_STEPS : ["PendingPayment", "Paid", "Packed", "Delivered", "Completed"]
  const idx = steps.indexOf(order.status)
  if (order.status === "Cancelled" || order.status === "Refunded") {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">
        Order {order.status === "Cancelled" ? "cancelled" : "refunded"}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((s, i) => {
        const done = i <= idx
        const isCurrent = i === idx
        return (
          <div key={s} className="flex items-center gap-1">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                done ? "bg-primary text-primary-foreground" : isCurrent ? "bg-secondary text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {done ? <CircleCheck className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                done ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {ORDER_STATUS_LABELS[s] || s}
            </span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-4 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

function OrderItems({ items }: { items?: OrderItem[] }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">No items</p>
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const img = item.product?.images?.[0]?.url || ""
        const isCustom = item.type === "custom" || (!item.variantId && item.template)
        return (
          <div key={item.id} className="flex gap-3">
            {img ? (
              <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image src={mediaUrl(img)} alt={item.product?.name || "item"} fill sizes="44px" className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-semibold">
                {item.product?.name || "Custom order"}
                {isCustom && <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">CUSTOM</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.variant?.size?.name && `Size ${item.variant.size.name}`}
                {item.variant?.size?.name && item.variant?.color?.name && " · "}
                {item.variant?.color?.name}
                {item.template?.name && ` · Template: ${item.template.name}`}
                {" × "}{item.quantity}
              </p>
            </div>
            <span className="text-sm font-semibold">{formatMoney(item.subtotal)}</span>
          </div>
        )
      })}
    </div>
  )
}

function OrderDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchOrder(id)
      setOrder(data)
    } catch {
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <div className="mx-auto max-w-3xl space-y-3 px-4 py-8"><Skeleton className="h-8 w-56" /><Skeleton className="h-40 w-full rounded-2xl" /></div>
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-lg font-semibold">Order not found</p>
        <Button variant="ghost" onClick={onBack} className="mt-3"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
      </div>
    )
  }

  const cancellable = order.customerId && ["PendingPayment", "Paid", "MeasurementPending"].includes(order.status)

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await cancelOrder(order.id, "Cancelled by customer")
      toast.success("Order cancelled")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-secondary">{order.orderNumber}</h1>
          <p className="text-xs text-muted-foreground">Placed {formatDate(order.createdAt)}</p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", ORDER_STATUS_COLORS[order.status] || "bg-slate-100")}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-4">
        <StatusTimeline order={order} />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-base font-bold text-secondary">Items</h2>
        <OrderItems items={order.items} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-bold text-secondary">Customer</h3>
          <p className="text-sm">{order.customer?.username || order.customer?.email || "—"}</p>
          <p className="text-xs text-muted-foreground">{order.customer?.phone || ""}</p>
        </div>
        {order.deliveryInfo && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-2 text-sm font-bold text-secondary">Delivery</h3>
            <p className="text-sm">{String((order.deliveryInfo as any).fullName || order.customer?.username || "")}</p>
            <p className="text-xs text-muted-foreground">
              {[
                (order.deliveryInfo as any).city,
                (order.deliveryInfo as any).address,
                (order.deliveryInfo as any).phone,
              ].filter(Boolean).join(", ")}
            </p>
            {(order.deliveryInfo as any).paymentMethod && (
              <p className="mt-1 text-xs font-medium text-primary">
                Payment: {String((order.deliveryInfo as any).paymentMethod)}
              </p>
            )}
          </div>
        )}
      </div>

      {order.notes && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-2 text-sm font-bold text-secondary">Notes</h3>
          <p className="text-sm text-muted-foreground">{order.notes}</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-extrabold text-primary">{formatMoney(order.totalPrice)}</p>
        </div>
        {cancellable && (
          <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? "Cancelling..." : "Cancel order"}
          </Button>
        )}
      </div>
    </div>
  )
}

function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyOrders().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <ReceiptText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-extrabold text-secondary">My Orders</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-14 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-semibold">No orders yet</p>
          <p className="text-sm text-muted-foreground">Place your first order from the shop.</p>
          <Link href="/products"><Button variant="outline" className="mt-4">Shop now</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders?id=${order.id}`}
              className="block rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-secondary">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.type === "custom" ? "Custom order" : "Ready-made"} · {formatDate(order.createdAt)}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", ORDER_STATUS_COLORS[order.status] || "bg-slate-100")}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">
                  {(order.items || []).reduce((s, i) => s + i.quantity, 0)} item(s) · Seller: {order.seller?.username || "Hachalu"}
                </span>
                <span className="text-sm font-bold text-primary">{formatMoney(order.totalPrice)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function OrdersPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")
  if (id) return <OrderDetail key={id} id={id} onBack={() => router.push("/orders")} />
  return <OrdersList />
}

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <AuthGuard>
        <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">Loading...</div>}>
          <OrdersPageInner />
        </Suspense>
      </AuthGuard>
      <WebFooter />
    </div>
  )
}