import { requireTenantSession } from "@/lib/session"
import { notFound } from "next/navigation"
import { getTicketById, getTicketTimeline, getTicketAttachments, getTicketAudit } from "@/lib/repositories/tickets"
import { listStores, listSuppliers } from "@/lib/repositories/admin"
import { getUserPermissions } from "@/lib/permissions"
import { AppLayout } from "@/components/layout/app-layout"
import { TicketDetailClient } from "./ticket-detail-client"

interface TicketDetailPageProps {
  params: Promise<{ tenant: string; ticketId: string }>
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { tenant, ticketId } = await params

  const { session, tenantId } = await requireTenantSession(tenant)

  const ticket = await getTicketById(ticketId)

  if (!ticket || ticket.tenantId !== tenantId) {
    notFound()
  }

  const permissions = getUserPermissions(session.role)

  const [timeline, attachments, stores, suppliers, audit] = await Promise.all([
    getTicketTimeline(ticketId),
    getTicketAttachments(ticketId),
    listStores(tenantId),
    listSuppliers(tenantId),
    permissions.canSeeAudit ? getTicketAudit(ticketId) : Promise.resolve([]),
  ])

  const store = stores.find((s) => s.id === ticket.storeId)
  const activeSuppliers = suppliers.filter((s) => s.active)

  return (
    <AppLayout tenant={tenant}>
      <TicketDetailClient
        tenant={tenant}
        ticket={{
          ...ticket,
          storeName: store?.name || "—",
        }}
        timeline={timeline}
        attachments={attachments}
        audit={audit}
        suppliers={activeSuppliers}
        userRole={session.role}
        userId={session.uid}
        userName={session.name}
      />
    </AppLayout>
  )
}
