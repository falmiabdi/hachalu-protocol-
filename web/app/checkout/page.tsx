"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, CreditCard, MapPin, Phone, User } from "lucide-react"
import { AuthGuard, useAuth } from "@/components/auth/auth-guard"
import { useCart } from "@/lib/cart"
import { createOrder, formatMoney, mediaUrl } from "@/lib/hachalu"
import { SiteHeader } from "@/components/site-header"
import { WebFooter } from "@/components/site/web-footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const PAYMENT_METHODS = [
  { id: "chapa", name: "Chapa", desc: "Pay with Chapa (cards, Telebirr & other ETB options)" },
  { id: "telebirr", name: "Telebirr", desc: "Pay using your Telebirr wallet" },
  { id: "cash", name: "Cash on Delivery", desc: "Pay when your order arrives" },
]

function CheckoutInner() {
  const router = useRouter()
  const { lines, count, subtotal, clear } = useCart()
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.name || "")
  const [phone, setPhone] = useState("")
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("chapa")
  const [submitting, setSubmitting] = useState(false)
  const [placedOrder, setPlacedOrder] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  if (lines.length === 0 && !placedOrder) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-lg font-semibold">Nothing to check out</p>
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Link href="/products">
          <Button variant="outline" className="mt-4">Browse products</Button>
        </Link>
      </div>
    )
  }

  if (placedOrder) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-secondary">Order Placed!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order <span className="font-semibold text-primary">{orderNumber}</span> has been created. Total:{" "}
          <span className="font-semibold">{formatMoney(subtotal)}</span>
          {paymentMethod !== "cash" ? (
            <span className="block">
              Payment method: <span className="font-medium">{PAYMENT_METHODS.find((p) => p.id === paymentMethod)?.name}</span>.
              We will send you payment instructions to complete checkout.
            </span>
          ) : (
            <span className="block">You will pay on delivery.</span>
          )}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/orders">
            <Button>Track your order</Button>
          </Link>
          <Link href="/products">
            <Button variant="outline">Continue shopping</Button>
          </Link>
        </div>
      </div>
    )
  }

  const submit = async () => {
    if (!fullName.trim() || !phone.trim()) {
      toast.error("Please provide your name and phone")
      return
    }
    if (lines.length === 0) return
    setSubmitting(true)
    try {
      const order = await createOrder({
        type: "ready_made",
        items: lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.price,
        })),
        notes: notes.trim() || null,
        deliveryInfo: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          address: address.trim(),
          paymentMethod,
        },
      })
      clear()
      setOrderNumber(order.orderNumber)
      setPlacedOrder(order.id)
    } catch (e: any) {
      toast.error(e.message || "Failed to place order")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <button
        onClick={() => router.push("/cart")}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to cart
      </button>
      <h1 className="mb-6 text-2xl font-extrabold text-secondary">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-secondary">
              <MapPin className="h-4 w-4 text-primary" /> Delivery Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Full name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" placeholder="+251 9..." />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-secondary">
              <CreditCard className="h-4 w-4 text-primary" /> Payment Method
            </h2>
            <div className="grid gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                    paymentMethod === m.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      paymentMethod === m.id ? "border-primary" : "border-muted-foreground/40"
                    )}
                  >
                    {paymentMethod === m.id && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{m.name}</span>
                    <span className="block text-xs text-muted-foreground">{m.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-base font-bold text-secondary">Order notes</h2>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know about this order?"
              rows={3}
            />
          </section>
        </div>

        <div className="h-fit rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-base font-bold text-secondary">Your Order</h2>
          <div className="space-y-3">
            {lines.map((line) => (
              <div key={line.variantId} className="flex items-center gap-3">
                <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={mediaUrl(line.imageUrl)}
                    alt={line.productName}
                    fill
                    sizes="44px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{line.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {[line.sizeName && `Size ${line.sizeName}`, line.colorName].filter(Boolean).join(" · ")}
                    {" × "}{line.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatMoney(line.price * line.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items ({count})</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span>TBD</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{formatMoney(subtotal)}</span>
            </div>
          </div>
          <Button size="lg" className="mt-5 w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Placing order..." : `Place Order · ${formatMoney(subtotal)}`}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            By placing this order you agree to Hachalu Protocol&apos;s terms of service.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  const { user } = useAuth()
  const isAuth = !!user
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <AuthGuard>
        <CheckoutInner key={isAuth ? "auth" : "guest"} />
      </AuthGuard>
      <WebFooter />
    </div>
  )
}