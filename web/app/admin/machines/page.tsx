"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Truck, Plus, X } from "lucide-react"
import { createMachine, fetchMachines, type Machine } from "@/lib/hachalu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const STATUS_COLORS: Record<string, string> = {
  Available: "bg-green-100 text-green-700",
  InUse: "bg-orange-100 text-orange-700",
  Maintenance: "bg-red-100 text-red-700",
  Disabled: "bg-slate-200 text-slate-600",
}

export default function AdminMachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [code, setCode] = useState("")
  const [status, setStatus] = useState("Available")
  const [location, setLocation] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMachines(await fetchMachines())
    } catch {
      setMachines([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    if (!name.trim()) return toast.error("Machine name is required")
    setSubmitting(true)
    try {
      await createMachine({
        name: name.trim(),
        type: type.trim() || undefined,
        code: code.trim() || undefined,
        status,
        location: location.trim() || undefined,
      })
      toast.success("Machine added")
      setName(""); setType(""); setCode(""); setLocation("")
      setShowForm(false)
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
            <Truck className="h-5 w-5 text-orange-600" /> Machines
          </h1>
          <p className="text-sm text-muted-foreground">Shop floor machines and maintenance.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X className="mr-1 h-3.5 w-3.5" /> : <Plus className="mr-1 h-3.5 w-3.5" />} {showForm ? "Close" : "Add machine"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="grid gap-1">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Overlock" />
            </div>
            <div className="grid gap-1">
              <Label>Type</Label>
              <Input value={type} onChange={(e) => setType(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="OVL-01" />
            </div>
            <div className="grid gap-1">
              <Label>Status</Label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
                {["Available", "InUse", "Maintenance", "Disabled"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid gap-1">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={add} disabled={submitting}>
              {submitting && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Add
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : machines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">No machines found.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{m.name}</p>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", STATUS_COLORS[m.status || "Available"] || "bg-slate-100 text-slate-600")}>
                  {m.status || "Available"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{[m.code, m.type].filter(Boolean).join(" · ")}</p>
              {m.location && <p className="mt-1 text-xs text-slate-500">Location: {m.location}</p>}
              {m.maintenanceNotes && <p className="mt-1 text-xs text-amber-600">⚠ {m.maintenanceNotes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}