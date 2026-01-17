import { requireTenantSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { getUserPermissions } from "@/lib/permissions"
import { fetchTenantSettings } from "@/lib/services/adminService"
import { AppLayout } from "@/components/app-layout"
import { NewTicketForm } from "./new-ticket-form"

interface NewTicketPageProps {
  params: Promise<{ tenant: string }>
}

export default async function NewTicketPage({ params }: NewTicketPageProps) {
  const { tenant } = await params

  const { session, tenantId, tenantName } = await requireTenantSession(tenant)
  const permissions = getUserPermissions(session.role)

  if (!permissions.canCreateTicket) {
    redirect(`/t/${tenant}/warranty`)
  }

  const tenantSettings = await fetchTenantSettings(tenantId)

  // Check if Drive is configured
  const driveConfigured = !!tenantSettings?.driveRootFolderId

  return (
    <AppLayout
      tenant={tenant}
      tenantName={tenantSettings?.name || tenantName}
      userName={session.name}
      userRole={session.role}
      breadcrumbs={[
        { label: "Garantias", href: `/t/${tenant}/warranty` },
        { label: "Nova", href: `/t/${tenant}/warranty/new` },
      ]}
      title="Nova Garantia"
      showBackButton
    >
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Novo Ticket de Garantia</h1>
          <p className="text-muted-foreground">Preencha os dados do formulário do balcão</p>
        </div>

        {!driveConfigured ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h2 className="font-semibold text-destructive">Configuração Pendente</h2>
            <p className="text-sm text-destructive/80 mt-1">
              O Google Drive não está configurado. Solicite ao administrador para configurar a pasta raiz nas
              configurações do tenant.
            </p>
          </div>
        ) : (
          <NewTicketForm tenant={tenant} />
        )}
      </div>
    </AppLayout>
  )
}
