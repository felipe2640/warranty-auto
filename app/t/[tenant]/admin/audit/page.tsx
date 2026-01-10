import { redirect } from "next/navigation"
import { requireTenantSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { AppLayout } from "@/components/app-layout"
import { AuditTab } from "../tabs/audit-tab"

export default async function AdminAuditPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const { session } = await requireTenantSession(tenant)

  if (session.role !== ADMIN_ROLE) {
    redirect(`/t/${tenant}`)
  }

  return (
    <AppLayout tenant={tenant} userName={session.name} userRole={session.role} breadcrumbs={[{ label: "Admin" }, { label: "Auditoria" }]} title="Auditoria">
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <AuditTab tenant={tenant} />
        </div>
      </div>
    </AppLayout>
  )
}
