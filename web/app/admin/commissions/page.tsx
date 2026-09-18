"use client"

import { useCallback, useEffect, useState } from "react"
import { BadgeCheck, Ban, CreditCard, Loader2 } from "lucide-react"
import { fetchCommissions, formatDate, formatMoney, updateCommissionStatus, type Commission } from "@/lib/hachalu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const STATUS_PILLS: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Paid: "bg-green-100 text-green-700",
  Void: "bg-slate-200 text-slate-600",
}

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCommissions()
      setCommissions(data.commissions)
    } catch {
      setCommissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setStatus = async (id: string, status: "Paid" | "Void") => {
    setBusy(id)
    try {
      await updateCommissionStatus(id, status)
      toast.success(`Commission ${status.toLowerCase()}`)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setBusy(null)
    }
  }

  const total = commissions.filter((c) => c.status !== "Void").reduce((s, c) => s + c.amount, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-secondary">
            <CreditCard className="h-5 w-5 text-orange-600" /> Commissions
          </h1>
          <p className="text-sm text-muted-foreground">Seller earnings on completed orders.</p>
        </div>
        <div className="rounded-xl bg-green-50 px-4 py-2 text-right">
          <p className="text-xs text-green-700">Outstanding total</p>
          <p className="text-lg font-extrabold text-green-800">{formatMoney(total)}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : commissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          No commissions yet. They are generated when an order is completed.
        </div>
      ) : (
        <div className="space-y-3">
          {commissions.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{c.seller?.username || "Seller"}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_PILLS[c.status] || "bg-slate-100 text-slate-600")}>
                    {c.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {c.scope} · Order {c.order?.orderNumber || "—"} · {formatDate(c.createdAt)}
                  {c.rate !== undefined && <span> · {Math.round(Number(c.rate) * 100)}%</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-extrabold text-slate-900">{formatMoney(c.amount)}</span>
                {c.status === "Pending" ? (
                  <>
                    <Button size="sm" onClick={() => setStatus(c.id, "Paid")} disabled={busy === c.id}>
                      {busy === c.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <BadgeCheck className="mr-1 h-3.5 w-3.5" />} Mark paid
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(c.id, "Void")} disabled={busy === c.id}>
                      <Ban className="mr-1 h-3.5 w-3.5" /> Void
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">{c.paidAt ? `Paid ${formatDate(c.paidAt)}` : c.status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}