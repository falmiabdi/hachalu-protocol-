"use client"

import { AuthGuard, useAuth } from "@/components/auth/auth-guard"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  return (
    <DashboardShell
      role="admin"
      name={user?.name || 'Admin'}
      email={user?.email || ''}
      title="Hachalu Admin Portal"
      profilePhoto={user?.profilePhoto}
    >
      {children}
    </DashboardShell>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requiredRole="admin">
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthGuard>
  )
}
