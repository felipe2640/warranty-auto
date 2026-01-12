import { redirect } from "next/navigation"
import { requireTenantSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { fetchTenantSettings } from "@/lib/services/adminService"
import { AppLayout } from "@/components/app-layout"
import { SettingsTab } from "../tabs/settings-tab"
import type { TenantSettings } from "@/lib/schemas"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const { session, tenantName } = await requireTenantSession(tenant)

  if (session.role !== ADMIN_ROLE) {
    redirect(`/t/${tenant}`)
  }

  const settingsData = await fetchTenantSettings(session.tenantId)

  const settings: TenantSettings = settingsData || {
    id: session.tenantId,
    slug: tenant,
    name: tenant,
    driveRootFolderId: undefined,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    policies: {
      recebedorOnlyOwnStore: true,
      requireCanhotForCobranca: true,
      allowCloseWithoutResolution: false,
      defaultSlaDays: 30,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return (
    <AppLayout
      tenant={tenant}
      tenantName={settings.name || tenantName}
      userName={session.name}
      userRole={session.role}
      breadcrumbs={[
        { label: "Admin", href: `/t/${tenant}/admin` },
        { label: "Configurações", href: `/t/${tenant}/admin/settings` },
      ]}
      title="Configurações"
    >
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-4xl">
          <SettingsTab settings={settings} />
        </div>
      </div>
    </AppLayout>
  )
}
