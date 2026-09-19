"use client"

import { useRouter } from "next/navigation"
import { ProductCreateForm } from "@/components/site/product-create-form"

export default function AdminNewProductPage() {
  const router = useRouter()
  return (
    <ProductCreateForm
      title="Add Product"
      subtitle="Add a full product listing with photos, details and pricing — same form as sellers use."
      cancelHref="/admin/products"
      onDone={() => router.push("/admin/products")}
    />
  )
}