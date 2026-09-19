"use client"

import { SiteHeader } from "@/components/site-header"
import { WebFooter } from "@/components/site/web-footer"
import { AuthGuard } from "@/components/auth/auth-guard"
import { ProductCreateForm } from "@/components/site/product-create-form"

export default function SellPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <AuthGuard requiredRole="agent">
        <ProductCreateForm />
      </AuthGuard>
      <WebFooter />
    </div>
  )
}