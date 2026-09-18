"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Package, Plus, X, AlertTriangle } from "lucide-react"
import { addStockMovement, createMaterial, fetchMaterials, type Material } from "@/lib/hachalu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

export default function AdminInventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [lowStock, setLowStock] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [movementFor, setMovementFor] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [direction, setDirection] = useState("IN")

  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [unit, setUnit] = useState("")
  const [qty, setQty] = useState("")
  const [minStock, setMinStock] = useState("")

  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchMaterials()
      setMaterials(data.materials)
      setLowStock(data.lowStock || [])
    } catch {
      setMaterials([])
      setLowStock([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const addMaterial = async () => {
    if (!name.trim()) return toast.error("Material name required")
    setSubmitting(true)
    try {
      await createMaterial({
        name: name.trim(),
        category: category.trim() || undefined,
        unit: unit.trim() || undefined,
        currentQuantity: Number(qty) || 0,
        minStockLevel: Number(minStock) || undefined,
      })
      toast.success("Material added")
      setName(""); setCategory(""); setUnit(""); setQty(""); setMinStock("")
      setShowForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setSubmitting(false)
    }
  }

  const move = async () => {
    if (!movementFor || !Number(amount)) return toast.error("Enter a valid amount")
    setSubmitting(true)
    try {
      await addStockMovement({
        materialId: movementFor,
        type: direction,
        quantity: Number(amount),
        notes: `${direction} adjustment`,
      })
      toast.success("Stock updated")
      setMovementFor(null)
      setAmount("")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-secondary">
            <Package className="h-5 w-5 text-orange-600" /> Inventory
          </h1>
          <p className="text-sm text-muted-foreground">Materials, stock levels and movements.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X className="mr-1 h-3.5 w-3.5" /> : <Plus className="mr-1 h-3.5 w-3.5" />} {showForm ? "Close" : "Add material"}
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-800">Low stock alert</p>
            <p className="text-xs text-amber-700">
              {lowStock.map((m) => m.name).join(", ")} {lowStock.length > 1 ? "are" : "is"} below minimum.
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid gap-1">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Polyester thread" />
            </div>
            <div className="grid gap-1">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Fabric, Thread..." />
            </div>
            <div className="grid gap-1">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="meters" />
            </div>
            <div className="grid gap-1">
              <Label>Qty</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Min stock</Label>
              <Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={addMaterial} disabled={submitting}>
              {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Add
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : materials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">No materials found.</div>
      ) : (
        <div className="space-y-3">
          {materials.map((m) => {
            const low = m.currentQuantity <= (m.minStockLevel || 0)
            return (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-400">
                    {[m.category, m.unit && `per ${m.unit}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-sm font-bold", low ? "text-red-600" : "text-slate-900")}>
                    {m.currentQuantity} {m.unit || ""}
                  </span>
                  {low && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Low</span>}
                  <Button size="sm" variant="outline" onClick={() => setMovementFor(m.id)}>
                    Adjust
                  </Button>
                  {movementFor === m.id && (
                    <div className="flex items-center gap-2">
                      <select value={direction} onChange={(e) => setDirection(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-sm">
                        <option value="IN">Receive</option>
                        <option value="OUT">Use</option>
                      </select>
                      <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 w-24" />
                      <Button size="sm" onClick={move} disabled={submitting}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setMovementFor(null)}>Cancel</Button>
                    </div>
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