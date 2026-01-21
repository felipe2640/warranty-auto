import { redirect } from "next/navigation"
import { requireTenantSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { fetchUsers } from "@/lib/services/adminService"
import { fetchErpStores } from "@/lib/erp/stores"
import { AppLayout } from "@/components/app-layout"
import { UsersTab } from "../tabs/users-tab"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const { session, tenantName } = await requireTenantSession(tenant)

  if (session.role !== ADMIN_ROLE) {
    redirect(`/t/${tenant}`)
  }

  const [users, stores] = await Promise.all([fetchUsers(session.tenantId), fetchErpStores()])

  return (
    <AppLayout
      tenant={tenant}
      tenantName={tenantName}
      userName={session.name}
      userRole={session.role}
      breadcrumbs={[
        { label: "Admin", href: `/t/${tenant}/admin` },
        { label: "Usuários", href: `/t/${tenant}/admin/users` },
      ]}
      title="Usuários"
    >
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl">
          <UsersTab users={users} stores={stores} tenant={tenant} />
        </div>
      </div>
    </AppLayout>
  )
}
