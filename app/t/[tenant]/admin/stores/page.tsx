import { redirect } from "next/navigation"
import { requireTenantSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { fetchStores } from "@/lib/services/adminService"
import { AppLayout } from "@/components/app-layout"
import { StoresTab } from "../tabs/stores-tab"

export const dynamic = "force-dynamic"

export default async function AdminStoresPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const { session } = await requireTenantSession(tenant)

  if (session.role !== ADMIN_ROLE) {
    redirect(`/t/${tenant}`)
  }

  const stores = await fetchStores(session.tenantId)

  return (
    <AppLayout
      tenant={tenant}
      userName={session.name}
      userRole={session.role}
      breadcrumbs={[
        { label: "Admin", href: `/t/${tenant}/admin` },
        { label: "Lojas", href: `/t/${tenant}/admin/stores` },
      ]}
      title="Lojas"
    >
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl">
          <StoresTab stores={stores} />
        </div>
      </div>
    </AppLayout>
  )
}
