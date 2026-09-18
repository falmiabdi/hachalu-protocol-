"use client"

import { useEffect, useMemo, useState } from "react"
import type { MeasurementTemplate } from "@/lib/hachalu"
import { fetchMeasurementTemplates } from "@/lib/hachalu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

export interface MeasurementSelection {
  templateId?: string
  values: Record<string, string>
  complete: boolean
}

export interface MeasurementFormProps {
  productName: string
  defaultValue?: string | null
  onValues: (selection: MeasurementSelection) => void
}

export function MeasurementForm({ productName, defaultValue, onValues }: MeasurementFormProps) {
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([])
  const [templateId, setTemplateId] = useState<string>(defaultValue || "")
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchMeasurementTemplates()
      .then((t) => {
        if (!active) return
        setTemplates(t)
        if (t.length > 0 && !templateId) setTemplateId(t[0].id)
      })
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const template = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId])

  const fieldLabel = (key: string) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase())
      .trim()

  useEffect(() => {
    if (!template) return
    const required = template.fields.filter((f) => f.required !== false)
    const filled = required.every((f) => {
      const v = (values[f.key] ?? "").toString().trim()
      return v !== "" && Number(v) > 0
    })
    onValues({ templateId, values, complete: filled })
  }, [template, values, onValues])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    )
  }

  if (templates.length === 0) {
    return <p className="text-sm text-muted-foreground">No measurement templates available.</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-1.5">
        <Label>Measurement Template</Label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          For: {productName}. Enter measurements in centimeters.
        </p>
      </div>

      {template && (
        <div className="grid grid-cols-2 gap-3">
          {template.fields.map((field) => {
            const required = field.required !== false
            const v = values[field.key] ?? ""
            return (
              <div key={field.key} className="grid gap-1.5">
                <Label>
                  {field.label || fieldLabel(field.key)}
                  {required && <span className="text-destructive"> *</span>}
                </Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    value={v}
                    placeholder={field.unit}
                    onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  />
                  <span className="text-xs text-muted-foreground">{field.unit}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {template && template.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          This template has no fields defined. You can still place the order; ready-made details can be handled with the seller.
        </p>
      )}
    </div>
  )
}