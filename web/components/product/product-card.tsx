"use client"

import Image from "next/image"
import Link from "next/link"
import { ShoppingBag, BadgeCheck } from "lucide-react"
import type { Product } from "@/lib/hachalu"
import { cn } from "@/lib/utils"
import { formatMoney, mediaUrl, PRODUCT_STATUS_COLORS, PRODUCT_STATUS_LABELS } from "@/lib/hachalu"

export function ProductCard({ product, className }: { product: Product; className?: string }) {
  const primary = mediaUrl(product.images?.find((i) => i.position === "front")?.url || product.images?.[0]?.url)
  const minPrice =
    product.variants && product.variants.length > 0
      ? Math.min(...product.variants.map((v) => v.price))
      : null

  return (
    <Link
      href={`/products?id=${product.id}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        className || ""
      }`}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <Image
          src={primary}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
        {product.featured && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            <BadgeCheck className="h-3 w-3" /> Featured
          </span>
        )}
        {product.isCustomizable && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
            <ShoppingBag className="h-3 w-3 text-primary" /> Custom
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {product.category?.name || product.gender || "Hachalu"}
        </p>
        <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{product.name}</h3>
        {product.fabric && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{product.fabric}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-primary">
            {minPrice !== null ? `${formatMoney(minPrice)}+` : formatMoney(0)}
          </span>
          {product.sellerName && (
            <span className="line-clamp-1 max-w-[45%] text-[10px] text-muted-foreground">
              {product.sellerName}
            </span>
          )}
        </div>
        {product.status && product.status !== "Approved" && (
          <span
            className={cn(
              "mt-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold",
              PRODUCT_STATUS_COLORS[product.status] || "bg-slate-100 text-slate-700"
            )}
          >
            {PRODUCT_STATUS_LABELS[product.status] || product.status}
          </span>
        )}
      </div>
    </Link>
  )
}