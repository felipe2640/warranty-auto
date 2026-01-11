import { getSession } from "@/lib/session"
import { fetchTenantBySlug } from "@/lib/services/adminService"
import { redirect } from "next/navigation"
import { LoginForm } from "./login-form"
import { getAdminDb } from "@/lib/firebase/admin"

interface LoginPageProps {
  params: Promise<{ tenant: string }>
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { tenant } = await params

  // Check if tenant exists
  const tenantSettings = await fetchTenantBySlug(tenant)

  if (!tenantSettings) {
    const hasAnyTenant = !(await getAdminDb().collection("tenants").limit(1).get()).empty
    if (hasAnyTenant) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Tenant não encontrado</h1>
            <p className="text-muted-foreground">O tenant "{tenant}" não existe.</p>
          </div>
        </div>
      )
    }
  }

  // Check if already logged in
  const session = await getSession()

  if (session && tenantSettings && session.tenantId === tenantSettings.id) {
    redirect(`/t/${tenant}/dashboard`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <LoginForm tenant={tenant} tenantName={tenantSettings?.name ?? tenant} />
    </div>
  )
}
