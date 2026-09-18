"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, ArrowLeft } from "lucide-react"
import { useAuth } from "@/components/auth/auth-guard"
import { useCart } from "@/lib/cart"
import { formatMoney, mediaUrl } from "@/lib/hachalu"
import { SiteHeader } from "@/components/site-header"
import { WebFooter } from "@/components/site/web-footer"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"

export default function CartPage() {
  const { lines, count, subtotal, setQuantity, remove, clear } = useCart()
  const { isLoggedIn } = useAuth()
  const router = useRouter()

  const handleCheckout = () => {
    if (!isLoggedIn) {
      toast("Please sign in to checkout", { icon: "🔐" })
      router.push("/auth/login")
      return
    }
    router.push("/checkout")
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-secondary">
            <ShoppingBag className="h-6 w-6 text-primary" /> Shopping Cart
          </h1>
          {lines.length > 0 && (
            <button onClick={clear} className="text-sm font-medium text-destructive hover:underline">
              Clear cart
            </button>
          )}
        </div>

        {lines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-lg font-semibold">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">Browse the shop and add garments you like.</p>
            <Link href="/products">
              <Button variant="outline" className="mt-5">
                Browse products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {lines.map((line) => (
                <div
                  key={line.variantId}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={mediaUrl(line.imageUrl)}
                      alt={line.productName}
                      fill
                      sizes="80px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/products?id=${line.productId}`}
                          className="line-clamp-1 text-sm font-semibold hover:text-primary"
                        >
                          {line.productName}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[line.sizeName && `Size ${line.sizeName}`, line.colorName]
                            .filter(Boolean)
                            .join(" · ") || "One size"}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(line.variantId)}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Decrease"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{line.quantity}</span>
                        <button
                          onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Increase"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-primary">{formatMoney(line.price * line.quantity)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-2xl border border-border bg-card p-5">
              <h2 className="text-base font-bold text-secondary">Order Summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items ({count})</span>
                  <span className="font-medium">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium">Calculated at checkout</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatMoney(subtotal)}</span>
                </div>
              </div>
              <Button size="lg" className="mt-5 w-full" onClick={handleCheckout}>
                Checkout <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <Link
                href="/products"
                className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Continue shopping
              </Link>
            </div>
          </div>
        )}
      </div>
      <WebFooter />
    </div>
  )
}