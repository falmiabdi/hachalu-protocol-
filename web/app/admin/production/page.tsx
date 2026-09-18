"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Scissors } from "lucide-react"
import {
  assignJobWorkers,
  fetchProductionJobs,
  fetchWorkers,
  updateJobQc,
  updateJobStatus,
  JOB_STATUS_LABELS,
  type ProductionJob,
  type Worker,
} from "@/lib/hachalu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

const FLOW = [
  "Assigned",
  "Started",
  "InProgress25",
  "InProgress50",
  "InProgress75",
  "Ready",
  "QualityCheck",
  "Completed",
]

export default function AdminProductionPage() {
  const [jobs, setJobs] = useState<ProductionJob[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [assignTarget, setAssignTarget] = useState<string | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<string>("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [j, w] = await Promise.all([fetchProductionJobs(), fetchWorkers()])
      setJobs(j.jobs)
      setWorkers(w)
    } catch {
      setJobs([])
      setWorkers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const advance = async (job: ProductionJob, status: string) => {
    setBusy(job.id)
    try {
      await updateJobStatus(job.id, status)
      toast.success(`Job → ${JOB_STATUS_LABELS[status] || status}`)
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setBusy(null)
    }
  }

  const approveQc = async (job: ProductionJob) => {
    setBusy(job.id)
    try {
      await updateJobQc(job.id, "Approved")
      toast.success("QC approved — job completed")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed")
    } finally {
      setBusy(null)
    }
  }

  const doAssign = async () => {
    if (!assignTarget || !selectedWorker) return
    setBusy(assignTarget)
    try {
      await assignJobWorkers(assignTarget, [selectedWorker])
      toast.success("Worker assigned")
      setAssignTarget(null)
      setSelectedWorker("")
      load()
    } catch (e: any) {
      toast.error(e.message || "Failed to assign")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-secondary">
          <Scissors className="h-5 w-5 text-orange-600" /> Production
        </h1>
        <p className="text-sm text-muted-foreground">Assign tailors and track each job through production.</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 p-14 text-center">
          <Scissors className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-600">No production jobs yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const idx = FLOW.indexOf(job.status)
            const isCompleted = job.status === "Completed"
            return (
              <div key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {job.order?.orderNumber || "Job"} <span className="font-normal text-slate-400">·</span>{" "}
                      {job.orderItem?.product?.name || job.product?.name || "Garment"}
                      {job.orderItem?.template?.name && (
                        <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                          {job.orderItem.template.name}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {job.order?.type === "custom" ? "Custom order" : "Ready-made"} ·{" "}
                      {job.assignees?.length
                        ? `Assigned to ${job.assignees.map((a) => a.worker.user.username || "tailor").join(", ")}`
                        : "Not yet assigned"}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {JOB_STATUS_LABELS[job.status] || job.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {FLOW.map((s, i) => (
                    <div key={s} className="flex items-center gap-1">
                      <button
                        onClick={() => advance(job, s)}
                        disabled={busy === job.id || i < idx || i === idx}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                          i === idx
                            ? "border-orange-500 bg-orange-500 text-white"
                            : i < idx
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-slate-200 text-slate-400 hover:border-orange-300 hover:text-orange-600"
                        )}
                      >
                        {busy === job.id && i === idx ? <Loader2 className="h-3 w-3 animate-spin" /> : JOB_STATUS_LABELS[s]}
                      </button>
                      {i < FLOW.length - 1 && <span className="h-px w-2 bg-slate-200" />}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  {!isCompleted && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          setAssignTarget(job.id)
                          setSelectedWorker("")
                        }}
                      >
                        Assign worker
                      </Button>
                      {job.status === "QualityCheck" && (
                        <Button size="sm" variant="secondary" onClick={() => approveQc(job)}>
                          QC approve
                        </Button>
                      )}
                    </>
                  )}
                  {assignTarget === job.id && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedWorker}
                        onChange={(e) => setSelectedWorker(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 px-2 text-sm"
                      >
                        <option value="">Pick a tailor</option>
                        {workers
                          .filter((w) => w.status !== "Busy")
                          .map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.user?.username} {w.specialty ? `(${w.specialty})` : ""}
                            </option>
                          ))}
                      </select>
                      <Button size="sm" onClick={doAssign} disabled={!selectedWorker}>
                        Assign
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAssignTarget(null)}>
                        Cancel
                      </Button>
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