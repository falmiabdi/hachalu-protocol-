"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Check, X, Loader2, PackageOpen } from "lucide-react"
import {
  adminApproveProduct,
  adminRejectProduct,
  adminSetProductStatus,
  fetchAdminProducts,
  formatDate,
  formatMoney,
  mediaUrl,
  PRODUCT_STATUS_COLORS,
  PRODUCT_STATUS_LABELS,
  type Product,
} from "@/lib/hachalu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const FILTERS = [
  { value: "", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "OutOfStock", label: "Out of Stock" },
]

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminProducts({ status: filter || undefined, limit: 100 })
      setProducts(data.products)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const approve = async (id: string) => {
    setBusy(id)
    try {
      await adminApproveProduct(id)
      toast.success("Product approved")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setBusy(null)
    }
  }

  const reject = async (id: string) => {
    const reason = window.prompt("Rejection reason:")
    if (reason === null) return
    setBusy(id)
    try {
      await adminRejectProduct(id, reason || "Not approved")
      toast.success("Product rejected")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setBusy(null)
    }
  }

  const toggleStock = async (id: string, status: string) => {
    setBusy(id)
    try {
      await adminSetProductStatus(id, status === "OutOfStock" ? "Approved" : "OutOfStock")
      toast.success("Stock status updated")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-secondary">Products</h1>
          <p className="text-sm text-muted-foreground">Review listings, approve or reject.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                filter === f.value ? "border-orange-500 bg-orange-500 text-white" : "border-slate-200 text-slate-600 hover:border-orange-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <PackageOpen className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-600">No products</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const img = mediaUrl(p.images?.[0]?.url)
            const minPrice = p.variants?.length ? Math.min(...p.variants.map((v) => v.price)) : null
            return (
              <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex gap-3">
                  {img ? (
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <Image src={img} alt={p.name} fill sizes="64px" className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="flex h-20 w-16 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <PackageOpen className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900">{p.name}</p>
                    <p className="text-xs text-slate-400">by {p.seller?.username || "—"}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", PRODUCT_STATUS_COLORS[p.status] || "bg-slate-100 text-slate-600")}>
                        {PRODUCT_STATUS_LABELS[p.status] || p.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{minPrice !== null ? `${formatMoney(minPrice)}+` : "—"}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-400">{formatDate(p.createdAt)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.status === "Pending" && (
                    <>
                      <Button size="sm" onClick={() => approve(p.id)} disabled={busy === p.id}>
                        {busy === p.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />} Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => reject(p.id)} disabled={busy === p.id}>
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  )}
                  {p.status === "Approved" && (
                    <Button size="sm" variant="outline" onClick={() => toggleStock(p.id, p.status)} disabled={busy === p.id}>
                      Mark out of stock
                    </Button>
                  )}
                  {p.status === "OutOfStock" && (
                    <Button size="sm" variant="outline" onClick={() => toggleStock(p.id, p.status)} disabled={busy === p.id}>
                      Back in stock
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}