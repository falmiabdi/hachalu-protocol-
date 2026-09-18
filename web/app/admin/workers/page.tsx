"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Hammer, Plus, X } from "lucide-react"
import { createWorker, fetchWorkers, type Worker } from "@/lib/hachalu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [specialty, setSpecialty] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setWorkers(await fetchWorkers())
    } catch {
      setWorkers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    if (!name.trim() || !email.trim()) return toast.error("Name and email are required")
    setSubmitting(true)
    try {
      await createWorker({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, specialty: specialty.trim() || undefined })
      toast.success("Worker added")
      setName("")
      setEmail("")
      setPhone("")
      setSpecialty("")
      setShowForm(false)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to add worker")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-secondary">
            <Hammer className="h-5 w-5 text-orange-600" /> Workers
          </h1>
          <p className="text-sm text-muted-foreground">Tailoring staff and their workload.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          {showForm ? <X className="mr-1 h-3.5 w-3.5" /> : <Plus className="mr-1 h-3.5 w-3.5" />} {showForm ? "Close" : "Add worker"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1">
              <Label>Full name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Abebe Kebede" />
            </div>
            <div className="grid gap-1">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="abebe@hachalu.com" />
            </div>
            <div className="grid gap-1">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Specialty</Label>
              <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Suits, Shirts..." />
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{ [0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : workers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">No workers found.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workers.map((w) => (
            <div key={w.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900">{w.user?.username || "Worker"}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    w.status === "Busy" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                  )}
                >
                  {w.status || "Available"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{w.user?.email || ""}</p>
              {w.specialty && <p className="mt-1 text-xs text-slate-500">Specialty: {w.specialty}</p>}
              {w.machine && <p className="mt-1 text-xs text-slate-500">Machine: {w.machine.name}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}