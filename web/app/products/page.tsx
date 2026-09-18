"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  BadgeCheck,
  Minus,
  Plus,
  Ruler,
  Scissors,
  ShoppingCart,
} from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { ProductCard } from "@/components/product/product-card"
import { ProductGallery } from "@/components/product/product-gallery"
import { MeasurementForm, type MeasurementSelection } from "@/components/product/measurement-form"
import { WebFooter } from "@/components/site/web-footer"
import {
  fetchCategories,
  fetchProduct,
  fetchProducts,
  createOrder,
  formatMoney,
  mediaUrl,
  type Product,
  type ProductCategory,
  type ProductVariant,
} from "@/lib/hachalu"
import { useCart } from "@/lib/cart"
import { useAuth } from "@/components/auth/auth-guard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

function ProductDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const { add, open } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showCustom, setShowCustom] = useState(false)
  const [measurement, setMeasurement] = useState<MeasurementSelection | null>(null)
  const [submittingCustom, setSubmittingCustom] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = await fetchProduct(id)
      setProduct(p)
      const firstVar = p.variants?.[0]
      if (firstVar) {
        setSelectedSize(firstVar.size?.id || null)
        setSelectedColor(firstVar.color?.id || null)
      }
    } catch {
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl grid gap-6 px-4 py-8 sm:px-6 md:grid-cols-2">
        <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-lg font-semibold">Product not found</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to shop
        </Button>
      </div>
    )
  }

  const variants = product.variants || []
  const colorOptions = [...new Map(variants.map((v) => [v.color?.id || "none", v.color])).values()]
  const sizeOptions = [...new Map(variants.map((v) => [v.size?.id || "none", v.size])).values()]
  const selectedVariant: ProductVariant | undefined = variants.find(
    (v) =>
      (selectedSize === null || v.size?.id === selectedSize) &&
      (selectedColor === null || v.color?.id === selectedColor)
  )
  const fallbackVariant = variants[0]
  const variant = selectedVariant || (variants.length === 1 ? variants[0] : undefined)
  const price = variant?.price ?? fallbackVariant?.price ?? 0
  const maxStock = variant?.stock ?? 0

  const requireAuth = () => {
    if (!isLoggedIn) {
      router.push("/auth/login")
      return false
    }
    return true
  }

  const handleAddToCart = () => {
    if (!requireAuth()) return
    if (!variant) {
      toast.error("Select a size and color first")
      return
    }
    if (variant.stock < quantity) {
      toast.error("Not enough stock")
      return
    }
    add(product, variant, quantity)
    toast.success("Added to cart")
    open()
  }

  const handleCustomOrder = async () => {
    if (!requireAuth()) return
    if (!measurement || !measurement.templateId) {
      toast.error("Fill in the measurement details")
      return
    }
    setSubmittingCustom(true)
    try {
      const values: Record<string, number> = {}
      for (const [k, v] of Object.entries(measurement.values)) {
        const n = Number(v)
        if (v !== "" && !Number.isNaN(n)) values[k] = n
      }
      const order = await createOrder({
        type: "custom",
        items: [
          {
            productId: product.id,
            quantity,
            templateId: measurement.templateId,
            measurementValues: values,
            unitPrice: fallbackVariant?.price || 0,
            styleNotes: selectedSize ? { size: "Custom" } : undefined,
          },
        ],
        notes: "Made-to-measure order placed from product page.",
      })
      toast.success(`Custom order ${order.orderNumber} created`)
      router.push("/orders")
    } catch (e: any) {
      toast.error(e.message || "Failed to create custom order")
    } finally {
      setSubmittingCustom(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </button>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images || []} />

        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{product.category?.name || "Hachalu"}</span>
              {product.gender && <span>• {product.gender}</span>}
              {product.brand?.name && <span>• {product.brand.name}</span>}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-secondary sm:text-3xl">{product.name}</h1>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-bold text-primary">{formatMoney(price)}</span>
              {product.status === "OutOfStock" && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  Out of stock
                </span>
              )}
            </div>
          </div>

          {colorOptions.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Color</p>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c?.id || "none"}
                    onClick={() => setSelectedColor(c?.id || null)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      selectedColor === (c?.id || null)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {c?.hex && (
                      <span
                        className="h-3 w-3 rounded-full border border-black/10"
                        style={{ backgroundColor: c.hex }}
                      />
                    )}
                    {c?.name || "Default"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizeOptions.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((s) => (
                  <button
                    key={s?.id || "none"}
                    onClick={() => setSelectedSize(s?.id || null)}
                    className={cn(
                      "h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold transition",
                      selectedSize === (s?.id || null)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {s?.name || "OS"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-xl border border-border">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(maxStock || 99, q + 1))}
                className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {maxStock > 0 ? `${maxStock} in stock` : "Made to order"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={handleAddToCart} disabled={!variant || maxStock <= 0}>
              <ShoppingCart className="mr-1.5 h-4 w-4" /> Add to Cart
            </Button>
            <Button
              size="lg"
              variant="secondary"
              disabled={!product.isCustomizable}
              onClick={() => {
                if (!requireAuth()) return
                setShowCustom((s) => !s)
              }}
            >
              <Scissors className="mr-1.5 h-4 w-4" />
              {showCustom ? "Hide custom ordering" : "Order Made-to-Measure"}
            </Button>
            {!product.isCustomizable && (
              <p className="text-xs text-muted-foreground">Custom tailoring is not available for this product.</p>
            )}
          </div>

          {showCustom && (
            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Ruler className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Made-to-Measure Details</p>
              </div>
              <MeasurementForm
                productName={product.name}
                onValues={setMeasurement}
              />
              <Button
                className="mt-4 w-full"
                onClick={handleCustomOrder}
                disabled={submittingCustom || !measurement?.complete}
              >
                {submittingCustom ? "Creating order..." : "Place Custom Order"}
              </Button>
            </div>
          )}

          {product.description && (
            <div>
              <p className="mb-1 text-sm font-semibold">Description</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            {product.fabric && (
              <div>
                <p className="text-xs text-muted-foreground">Fabric</p>
                <p className="font-medium">{product.fabric}</p>
              </div>
            )}
            {product.countryOfOrigin && (
              <div>
                <p className="text-xs text-muted-foreground">Origin</p>
                <p className="font-medium">{product.countryOfOrigin}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Ready-made</p>
              <p className="font-medium">{product.isReadyMade ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custom</p>
              <p className="font-medium">{product.isCustomizable ? "Yes" : "No"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            {product.seller?.profilePhoto ? (
              <Image
                src={mediaUrl(product.seller.profilePhoto)}
                alt="seller"
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {(product.sellerName || "H").charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-sm font-semibold">
                {product.sellerName || "Hachalu Protocol"}
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {product.displayPhone || product.seller?.phone || "Contact via Hachalu"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductListing({ initialCustom = false }: { initialCustom?: boolean }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [customOnly, setCustomOnly] = useState(initialCustom)

  const load = useCallback(async (category: string | null, term: string) => {
    setLoading(true)
    try {
      const data = await fetchProducts({
        limit: 48,
        category: category || undefined,
        search: term || undefined,
        isCustomizable: customOnly || undefined,
      })
      setProducts(data.products)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [customOnly])

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    load(activeCategory, search)
  }, [load, activeCategory, search])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-secondary">Hachalu Shop</h1>
        <p className="text-sm text-muted-foreground">Ready-made garments and made-to-measure tailoring.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="h-9 w-full max-w-xs rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => setCustomOnly((c) => !c)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            customOnly ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
          )}
        >
          <Scissors className="h-3.5 w-3.5" /> Custom order
        </button>
        <button
          onClick={() => {
            setActiveCategory(null)
            setCustomOnly(false)
          }}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/40"
        >
          Reset
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium",
            activeCategory === null ? "border-primary bg-primary text-primary-foreground" : "border-border"
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(activeCategory === c.slug ? null : c.slug)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              activeCategory === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-border"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm font-semibold">No products match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id")

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      {id ? (
        <ProductDetail key={id} id={id} onBack={() => router.push("/products")} />
      ) : (
        <ProductListing initialCustom={searchParams.get("custom") === "1"} />
      )}
      <WebFooter />
    </div>
  )
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white"><SiteHeader /><div className="mx-auto max-w-7xl px-4 py-20 text-center"><p className="text-sm text-muted-foreground">Loading...</p></div></div>}>
      <ProductsPageInner />
    </Suspense>
  )
}