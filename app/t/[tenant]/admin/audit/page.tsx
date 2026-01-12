import { redirect } from "next/navigation"
import { requireTenantSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { AppLayout } from "@/components/app-layout"
import { AuditTab } from "../tabs/audit-tab"

export const dynamic = "force-dynamic"

export default async function AdminAuditPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const { session, tenantName } = await requireTenantSession(tenant)

  if (session.role !== ADMIN_ROLE) {
    redirect(`/t/${tenant}`)
  }

  return (
    <AppLayout
      tenant={tenant}
      tenantName={tenantName}
      userName={session.name}
      userRole={session.role}
      breadcrumbs={[
        { label: "Admin", href: `/t/${tenant}/admin` },
        { label: "Auditoria", href: `/t/${tenant}/admin/audit` },
      ]}
      title="Auditoria"
    >
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <AuditTab tenant={tenant} />
        </div>
      </div>
    </AppLayout>
  )
}
