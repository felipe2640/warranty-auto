import { requireTenantSession } from "@/lib/session"
import { notFound } from "next/navigation"
import { getUserPermissions } from "@/lib/permissions"
import { fetchTicketDetail } from "@/lib/services/warrantyService"
import { AppLayout } from "@/components/app-layout"
import { TicketDetailClient } from "./ticket-detail-client"

interface TicketDetailPageProps {
  params: Promise<{ tenant: string; ticketId: string }>
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { tenant, ticketId } = await params

  const { session, tenantId } = await requireTenantSession(tenant)

  const permissions = getUserPermissions(session.role)
  const detail = await fetchTicketDetail({
    tenantId,
    ticketId,
    canSeeAudit: permissions.canSeeAudit,
    role: session.role,
  })

  if (!detail) {
    notFound()
  }

  return (
    <AppLayout
      tenant={tenant}
      userName={session.name}
      userRole={session.role}
      breadcrumbs={[
        { label: "Garantias", href: `/t/${tenant}/warranty` },
        { label: "Detalhe", href: `/t/${tenant}/warranty/${ticketId}` },
      ]}
      title="Detalhe do Ticket"
      showBackButton
    >
      <TicketDetailClient
        tenant={tenant}
        ticket={detail.ticket}
        timeline={detail.timeline}
        attachments={detail.attachments}
        audit={detail.audit}
        suppliers={detail.suppliers}
        userRole={session.role}
        userId={session.uid}
        userName={session.name}
        nextTransitionChecklist={detail.nextTransitionChecklist}
        stageSummaryMap={detail.stageSummaryMap}
      />
    </AppLayout>
  )
}
