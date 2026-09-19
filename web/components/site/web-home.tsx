"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, Sparkles, Scissors, Truck, ShieldCheck } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { ProductCard } from "@/components/product/product-card"
import { WebFooter } from "@/components/site/web-footer"
import { fetchProducts, fetchCategories, type Product, type ProductCategory } from "@/lib/hachalu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function WebHome() {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
  const [custom, setCustom] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [heroVideoFailed, setHeroVideoFailed] = useState(false)
  const heroVideoRef = useRef<HTMLVideoElement>(null)

  const load = async (category: string | null, term: string) => {
    setLoading(true)
    try {
      const [main, feat, cust] = await Promise.all([
        fetchProducts({ limit: 24, category: category || undefined, search: term || undefined }),
        fetchProducts({ limit: 4, featured: true }),
        fetchProducts({ limit: 4, isCustomizable: true }),
      ])
      setProducts(main.products)
      setFeatured(feat.products)
      setCustom(cust.products)
    } catch {
      setProducts([])
      setFeatured([])
      setCustom([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {})
  }, [])

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video || heroVideoFailed) return
    const attempt = video.play()
    if (attempt) {
      attempt.catch((err) => {
        if (err?.name !== "AbortError") setHeroVideoFailed(true)
      })
    }
  }, [heroVideoFailed])

  useEffect(() => {
    load(activeCategory, search)
  }, [activeCategory, search])

  const triggers = (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Categories:</span>
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
            activeCategory === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:border-primary/40"
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(activeCategory === c.slug ? null : c.slug)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              activeCategory === c.slug
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:border-primary/40"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      {loading ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium">No products found</p>
          <p className="text-xs text-muted-foreground">
            Check back soon or browse the custom tailoring section.
          </p>
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

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <section className="relative overflow-hidden bg-secondary">
        {!heroVideoFailed && (
          <video
            ref={heroVideoRef}
            src="/hero%20background%20video.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
            onError={() => setHeroVideoFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-slate-950/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/30 to-transparent" />

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between md:py-24">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Ethiopian Tailoring, Modern Standards
            </div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Hachalu <span className="text-primary">Protocol</span>
            </h1>
            <p className="mt-3 text-base text-white/85 sm:text-lg">
              Shop ready-made garments or commission bespoke custom tailoring — measured, tracked and
              delivered from our shop floor to your door.
            </p>
            <form
              className="mt-6 flex max-w-md items-center gap-2 rounded-2xl border border-white/20 bg-white/15 p-1.5 shadow-2xl backdrop-blur-xl"
              onSubmit={(e) => {
                e.preventDefault()
                load(activeCategory, search)
              }}
            >
              <Search className="ml-2 h-4 w-4 text-white/70" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search garments, fabric, style..."
                className="h-9 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/60"
              />
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Search
              </button>
            </form>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            {[
              { icon: Scissors, title: "Custom Tailoring", desc: "Bespoke suits, shirts & traditional wear" },
              { icon: Truck, title: "Order Tracking", desc: "Follow each order through production" },
              { icon: ShieldCheck, title: "Quality Checked", desc: "Every piece inspected before delivery" },
              { icon: Sparkles, title: "Ready-Made", desc: "Curated garments available today" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                <f.icon className="h-5 w-5 text-primary" />
                <p className="mt-2 text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-white/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main>
        {featured.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-secondary">Featured</h2>
              <Link href="/products" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {featured.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6" id="products">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-secondary">Hachalu Shop</h2>
            <Link href="/products" className="text-sm font-medium text-primary hover:underline">
              Browse all
            </Link>
          </div>
          {triggers}
        </section>

        {custom.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <div className="rounded-3xl bg-gradient-to-r from-primary/10 to-secondary/10 p-6 sm:p-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-secondary">Custom Tailoring</h2>
                  <p className="text-sm text-muted-foreground">
                    Order made-to-measure — we take your measurements, choose fabric and style, then craft it.
                  </p>
                </div>
                <Link
                  href="/orders"
                  className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-secondary/90"
                >
                  Track an order
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {custom.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <WebFooter />
    </div>
  )
}