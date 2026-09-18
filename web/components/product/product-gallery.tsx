"use client"

import { useState } from "react"
import Image from "next/image"
import type { ProductImage } from "@/lib/hachalu"
import { mediaUrl } from "@/lib/hachalu"
import { cn } from "@/lib/utils"

const POSITION_ORDER = ["front", "back", "left", "right", "seatedFront", "seatedBack"]

export function ProductGallery({ images }: { images: ProductImage[] }) {
  const sorted = [...images].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a.position)
    const ib = POSITION_ORDER.indexOf(b.position)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
  const [active, setActive] = useState(0)
  if (sorted.length === 0) return null
  const current = sorted[active]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-muted">
        <Image
          src={mediaUrl(current.url)}
          alt={current.position}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          unoptimized
          priority
        />
        <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold capitalize backdrop-blur">
          {current.position}
        </span>
      </div>
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img, i) => (
            <button
              key={`${img.position}-${i}`}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition",
                active === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={mediaUrl(img.url)}
                alt={img.position}
                fill
                sizes="56px"
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}