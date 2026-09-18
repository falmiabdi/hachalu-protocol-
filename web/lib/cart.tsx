"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { Product, ProductVariant } from "@/lib/hachalu"

export interface CartLine {
  productId: string
  variantId: string
  productName: string
  imageUrl: string
  sizeName?: string
  colorName?: string
  price: number
  quantity: number
  sellerId?: string
  sellerName?: string
}

interface CartContextValue {
  lines: CartLine[]
  count: number
  subtotal: number
  isOpen: boolean
  add: (product: Product, variant: ProductVariant, quantity?: number) => void
  remove: (variantId: string) => void
  setQuantity: (variantId: string, quantity: number) => void
  clear: () => void
  open: () => void
  close: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = "hachalu_cart_v1"

function readStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartLine[]) : []
  } catch {
    return []
  }
}

function productImageUrl(product: Product): string {
  const images = product.images || []
  return images[0]?.url || "/placeholder.svg"
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setLines(readStorage())
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {}
  }, [lines])

  const add = useCallback((product: Product, variant: ProductVariant, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.variantId === variant.id)
      if (existing) {
        return prev.map((l) =>
          l.variantId === variant.id ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l
        )
      }
      const line: CartLine = {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        imageUrl: productImageUrl(product),
        sizeName: variant.size?.name,
        colorName: variant.color?.name,
        price: variant.price,
        quantity,
        sellerId: product.sellerId,
        sellerName: product.sellerName || product.seller?.username || undefined,
      }
      return [...prev, line]
    })
  }, [])

  const remove = useCallback((variantId: string) => {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId))
  }, [])

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(99, quantity)) } : l
      )
    )
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0)
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
    return { lines, count, subtotal, isOpen, add, remove, setQuantity, clear, open, close }
  }, [lines, isOpen, add, remove, setQuantity, clear, open, close])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}