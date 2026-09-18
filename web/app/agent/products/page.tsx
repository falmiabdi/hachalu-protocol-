"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Plus, ShoppingBag } from "lucide-react"
import { useAuth } from "@/components/auth/auth-guard"
import { deleteProduct, fetchSellerProducts, formatMoney, type Product } from "@/lib/hachalu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

export default function AgentProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      setProducts(await fetchSellerProducts())
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const remove = async (id: string) => {
    if (!window.confirm("Delete this product?")) return
    try {
      await deleteProduct(id)
      toast.success("Product deleted")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-secondary">
            <ShoppingBag className="h-5 w-5 text-orange-600" /> My products
          </h1>
          <p className="text-sm text-muted-foreground">Products you have listed on Hachalu.</p>
        </div>
        <Link href="/sell">
          <Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" /> List product</Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm font-semibold text-slate-600">You haven&apos;t listed any products</p>
          <Link href="/sell" className="mt-3 inline-block"><Button size="sm">List your first product</Button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const minPrice = p.variants?.length ? Math.min(...p.variants.map((v) => v.price)) : null
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-400">{minPrice !== null ? `${formatMoney(minPrice)}+` : "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    p.status === "Approved" ? "bg-green-100 text-green-700" : p.status === "Pending" ? "bg-amber-100 text-amber-700" : p.status === "OutOfStock" ? "bg-slate-200 text-slate-600" : "bg-red-100 text-red-700"
                  )}>
                    {p.status}
                  </span>
                  <Link href={`/products?id=${p.id}`} className="text-xs font-medium text-orange-600 hover:underline">View</Link>
                  <button onClick={() => remove(p.id)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}