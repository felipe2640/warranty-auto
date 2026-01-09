import type React from "react"
import { getSession } from "@/lib/session"
import { getTenantBySlug } from "@/lib/repositories/admin"
import { redirect } from "next/navigation"
import { AppSidebar } from "./app-sidebar"
import type { Role } from "@/lib/schemas"

interface AppLayoutProps {
  children: React.ReactNode
  tenant: string
}

export async function AppLayout({ children, tenant }: AppLayoutProps) {
  const session = await getSession()

  if (!session) {
    redirect(`/t/${tenant}/login`)
  }

  const tenantSettings = await getTenantBySlug(tenant)

  if (!tenantSettings || session.tenantId !== tenantSettings.id) {
    redirect(`/t/${tenant}/login`)
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        tenant={tenant}
        user={{
          name: session.name,
          email: session.email || "",
          role: session.role as Role,
        }}
      />

      {/* Main content */}
      <main className="md:pl-64">
        <div className="pt-16 md:pt-0">{children}</div>
      </main>
    </div>
  )
}
