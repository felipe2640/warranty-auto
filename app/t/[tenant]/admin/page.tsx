import { redirect } from "next/navigation"
import { requireTenantSession } from "@/lib/session"
import { AppLayout } from "@/components/app-layout"
import { fetchOpenTicketsCount, fetchSuppliers, fetchTenantSettings, fetchUsers } from "@/lib/services/adminService"
import { fetchErpStores } from "@/lib/erp/stores"
import { ADMIN_ROLE } from "@/lib/roles"
import type { TenantSettings } from "@/lib/schemas"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function AdminPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const { session, tenantId, tenantName } = await requireTenantSession(tenant)

  // Only ADMIN can access admin panel
  if (session.role !== ADMIN_ROLE) {
    redirect(`/t/${tenant}`)
  }

  const [users, stores, suppliers, settingsData, openTicketsCount] = await Promise.all([
    fetchUsers(tenantId),
    fetchErpStores(),
    fetchSuppliers(tenantId),
    fetchTenantSettings(tenantId),
    fetchOpenTicketsCount(tenantId),
  ])

  const settings: TenantSettings = settingsData || {
    id: tenantId,
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
      breadcrumbs={[{ label: "Admin", href: `/t/${tenant}/admin` }]}
      title="Administração"
    >
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href={`/t/${tenant}/admin/users`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle>Usuários</CardTitle>
                </CardHeader>
                <CardContent>{users.length} usuários</CardContent>
              </Card>
            </Link>
            <Link href={`/t/${tenant}/admin/stores`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle>Lojas</CardTitle>
                </CardHeader>
                <CardContent>{stores.length} lojas</CardContent>
              </Card>
            </Link>
            <Link href={`/t/${tenant}/admin/suppliers`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle>Fornecedores</CardTitle>
                </CardHeader>
                <CardContent>{suppliers.length} fornecedores</CardContent>
              </Card>
            </Link>
            <Link href={`/t/${tenant}/admin/settings`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle>Configurações</CardTitle>
                </CardHeader>
                <CardContent>{settings.driveRootFolderId ? "Drive configurado" : "Drive pendente"}</CardContent>
              </Card>
            </Link>
            <Link href={`/t/${tenant}/admin/audit`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle>Auditoria</CardTitle>
                </CardHeader>
                <CardContent>Visualizar registros</CardContent>
              </Card>
            </Link>
            <Card>
              <CardHeader>
                <CardTitle>Tickets Abertos</CardTitle>
              </CardHeader>
              <CardContent>{openTicketsCount} tickets em aberto</CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
