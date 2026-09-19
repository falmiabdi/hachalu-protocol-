"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react"
import {
  createProduct,
  fetchBrands,
  fetchCategories,
  fetchColors,
  fetchSizes,
  mediaUrl,
  type ProductBrand,
  type ProductCategory,
  type ProductColor,
} from "@/lib/hachalu"
import { getApiUrl } from "@/lib/get-api-url"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"

interface VariantRow {
  sizeId: string
  colorId: string
  price: string
  stock: string
}

const IMAGE_POSITIONS = ["front", "back", "left", "right", "seatedFront", "seatedBack"]

export function ProductCreateForm({
  title = "Sell on Hachalu",
  subtitle = "List a product for the shop — add photos, details and pricing. Products are reviewed before going live.",
  cancelHref = "/agent",
  onDone,
}: {
  title?: string
  subtitle?: string
  cancelHref?: string
  onDone?: () => void
}) {
  const router = useRouter()

  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [brands, setBrands] = useState<ProductBrand[]>([])
  const [colors, setColors] = useState<ProductColor[]>([])
  const [sizes, setSizes] = useState<{ id: string; name: string }[]>([])

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [gender, setGender] = useState("")
  const [ageGroup, setAgeGroup] = useState("")
  const [brandId, setBrandId] = useState("")
  const [country, setCountry] = useState("")
  const [fabric, setFabric] = useState("")
  const [isReadyMade, setIsReadyMade] = useState(true)
  const [isCustomizable, setIsCustomizable] = useState(false)

  const [images, setImages] = useState<{ position: string; url: string; uploading?: boolean }[]>([])

  const [variants, setVariants] = useState<VariantRow[]>([
    { sizeId: "", colorId: "", price: "", stock: "" },
  ])

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {})
    fetchBrands().then(setBrands).catch(() => {})
    fetchColors().then(setColors).catch(() => {})
    fetchSizes().then(setSizes).catch(() => {})
  }, [])

  const uploadImage = async (file: File, position: string) => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token")
    setImages((prev) => [...prev, { position, url: "", uploading: true }])
    const form = new FormData()
    form.append("file", file)
    try {
      const res = await fetch(`${getApiUrl()}/api/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Upload failed")
      setImages((prev) =>
        prev
          .map((img) =>
            img.uploading && img.url === "" && img.position === position
              ? { position, url: data.url as string, uploading: false }
              : img
          )
          .filter((i) => !(i.uploading && i.url === ""))
      )
      toast.success(`${position} image uploaded`)
    } catch (e: any) {
      toast.error(e.message || "Upload failed")
      setImages((prev) => prev.filter((i) => !(i.uploading && i.url === "")))
    }
  }

  const updateRow = (index: number, patch: Partial<VariantRow>) =>
    setVariants((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const submit = async () => {
    if (name.trim().length < 3) return toast.error("Enter a product name")
    if (!categoryId) return toast.error("Choose a category")
    const readyImages = images.filter((i) => i.url)
    if (readyImages.length < 4) return toast.error("Upload at least 4 product images (front, back, left, right)")
    const validVariants = variants.filter((v) => v.price && Number(v.price) > 0)
    if (validVariants.length === 0) return toast.error("Add at least one variant with a price")

    setSubmitting(true)
    try {
      const product = await createProduct({
        name: name.trim(),
        description: description.trim() || undefined,
        categoryId,
        gender: gender || undefined,
        ageGroup: ageGroup || undefined,
        brandId: brandId || undefined,
        countryOfOrigin: country.trim() || undefined,
        fabric: fabric.trim() || undefined,
        isReadyMade,
        isCustomizable,
        images: readyImages.map((i, idx) => ({ position: i.position, url: i.url })),
        variants: validVariants.map((v) => ({
          sizeId: v.sizeId || undefined,
          colorId: v.colorId || undefined,
          price: Number(v.price),
          stock: Number(v.stock) || 0,
        })),
      })
      toast.success("Product submitted! It will appear after review.")
      if (onDone) onDone()
      else router.push("/agent")
    } catch (e: any) {
      toast.error(e.message || "Failed to create product")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold text-secondary">{title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-base font-bold text-secondary">Photos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((slot) => {
            const pos = IMAGE_POSITIONS[slot] || `extra${slot}`
            const img = images.find((i) => i.position === pos)
            const filled = images.find((i) => i.position === pos)
            return (
              <div key={pos}>
                <label
                  className={cn(
                    "relative flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed transition",
                    filled ? "border-transparent" : "border-border hover:border-primary/50"
                  )}
                >
                  {img?.uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : filled ? (
                    <Image src={mediaUrl(filled.url)} alt={pos} fill sizes="160px" className="object-cover" unoptimized />
                  ) : (
                    <>
                      <UploadCloud className="h-6 w-6 text-muted-foreground" />
                      <span className="text-[11px] font-medium capitalize text-muted-foreground">{pos}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) uploadImage(f, pos)
                    }}
                  />
                </label>
                {filled && (
                  <button
                    onClick={() =>
                      setImages((prev) => prev.filter((i) => i.position !== pos))
                    }
                    className="mt-1 flex w-full items-center justify-center gap-1 text-[11px] text-destructive hover:underline"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">At least 4 images required (front, back, left, right).</p>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-4 text-base font-bold text-secondary">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Product name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Classic Black Suit" />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid gap-1.5">
            <Label>Category *</Label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Gender</Label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Any / Unisex</option>
              {["Male", "Female", "Unisex", "Boys", "Girls"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Age group</Label>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Any</option>
              {["Adult", "Children", "Teen", "Infant"].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Brand</Label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">None</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>Country of origin</Label>
            <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Ethiopia, Turkey..." />
          </div>
          <div className="grid gap-1.5">
            <Label>Fabric / material</Label>
            <Input value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Premium wool blend" />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isReadyMade} onChange={(e) => setIsReadyMade(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm">Ready-made (in stock)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isCustomizable} onChange={(e) => setIsCustomizable(e.target.checked)} className="h-4 w-4" />
            <span className="text-sm">Available for custom tailoring</span>
          </label>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-secondary">Variants & Pricing</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVariants((prev) => [...prev, { sizeId: "", colorId: "", price: "", stock: "" }])}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add variant
          </Button>
        </div>
        <div className="space-y-3">
          {variants.map((row, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Size</Label>
                <select value={row.sizeId} onChange={(e) => updateRow(i, { sizeId: e.target.value })} className="flex h-9 w-24 rounded-lg border border-input bg-background px-2 text-sm">
                  <option value="">Any</option>
                  {sizes.map((s2) => (
                    <option key={s2.id} value={s2.id}>{s2.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Color</Label>
                <select value={row.colorId} onChange={(e) => updateRow(i, { colorId: e.target.value })} className="flex h-9 w-28 rounded-lg border border-input bg-background px-2 text-sm">
                  <option value="">Default</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Price (ETB) *</Label>
                <Input type="number" min="0" value={row.price} onChange={(e) => updateRow(i, { price: e.target.value })} className="h-9 w-28" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Stock</Label>
                <Input type="number" min="0" value={row.stock} onChange={(e) => updateRow(i, { stock: e.target.value })} className="h-9 w-24" />
              </div>
              {variants.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove variant"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={() => router.push(cancelHref)}>Cancel</Button>
        <Button size="lg" onClick={submit} disabled={submitting}>
          {submitting ? (<><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Submitting...</>) : "Submit for review"}
        </Button>
      </div>
    </div>
  )
}