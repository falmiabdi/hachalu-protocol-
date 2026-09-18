"use client"

import { useCallback, useEffect, useState } from "react"
import { CreditCard } from "lucide-react"
import { fetchMyCommissions, formatDate, formatMoney, type Commission } from "@/lib/hachalu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function AgentCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setCommissions(await fetchMyCommissions())
    } catch {
      setCommissions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const pending = commissions.filter((c) => c.status === "Pending").reduce((s, c) => s + c.amount, 0)
  const paid = commissions.filter((c) => c.status === "Paid").reduce((s, c) => s + c.amount, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-secondary">
          <CreditCard className="h-5 w-5 text-orange-600" /> My commissions
        </h1>
        <p className="text-sm text-muted-foreground">Earnings generated when your orders complete.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="text-2xl font-extrabold text-amber-700">{formatMoney(pending)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Paid</p>
          <p className="text-2xl font-extrabold text-green-700">{formatMoney(paid)}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
      ) : commissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          No commissions yet.
        </div>
      ) : (
        <div className="space-y-3">
          {commissions.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {formatMoney(c.amount)}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    · {Math.round(Number(c.rate) * 100)}% of order
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Order {c.order?.orderNumber || "—"} · {formatDate(c.createdAt)}
                </p>
              </div>
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                c.status === "Paid" ? "bg-green-100 text-green-700" : c.status === "Void" ? "bg-slate-200 text-slate-600" : "bg-amber-100 text-amber-700"
              )}>
                {c.status} {c.paidAt ? `· ${formatDate(c.paidAt)}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}