import { redirect } from "next/navigation"
import { requireTenantSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { fetchSuppliers } from "@/lib/services/adminService"
import { AppLayout } from "@/components/app-layout"
import { SuppliersTab } from "../tabs/suppliers-tab"

export const dynamic = "force-dynamic"

export default async function AdminSuppliersPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const { session } = await requireTenantSession(tenant)

  if (session.role !== ADMIN_ROLE) {
    redirect(`/t/${tenant}`)
  }

  const suppliers = await fetchSuppliers(session.tenantId)

  return (
    <AppLayout tenant={tenant} userName={session.name} userRole={session.role} breadcrumbs={[{ label: "Admin" }, { label: "Fornecedores" }]} title="Fornecedores">
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl">
          <SuppliersTab suppliers={suppliers} />
        </div>
      </div>
    </AppLayout>
  )
}
