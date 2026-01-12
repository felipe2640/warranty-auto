import { requireTenantSession } from "@/lib/session"
import { AgendaClient } from "./agenda-client"
import { fetchSuppliers, fetchStores } from "@/lib/services/adminService"
import { fetchAgendaTickets } from "@/lib/services/warrantyService"
import type { Ticket, Store } from "@/lib/schemas"

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ tab?: string; cursor?: string }>
}) {
  const { tenant } = await params
  const { tab, cursor } = await searchParams
  const { session, tenantId } = await requireTenantSession(tenant)

  const activeTab = tab === "atrasadas" || tab === "proximos" || tab === "hoje" ? tab : "hoje"

  const [suppliers, stores] = await Promise.all([
    fetchSuppliers(tenantId),
    fetchStores(tenantId),
  ])

  // Create store map
  const storeMap = new Map<string, string>()
  stores.forEach((s: Store) => storeMap.set(s.id, s.name))

  // Create supplier map
  const supplierMap = new Map<string, string>()
  suppliers.forEach((s) => supplierMap.set(s.id, s.name))

  const [todayPage, overduePage, nextPage] = await Promise.all([
    fetchAgendaTickets({ tenantId, tab: "hoje", limit: 20, cursor: activeTab === "hoje" ? cursor : undefined }),
    fetchAgendaTickets({ tenantId, tab: "atrasadas", limit: 20, cursor: activeTab === "atrasadas" ? cursor : undefined }),
    fetchAgendaTickets({ tenantId, tab: "proximos", limit: 20, cursor: activeTab === "proximos" ? cursor : undefined }),
  ])

  const formatTicket = (ticket: Ticket) => ({
    ...ticket,
    storeName: storeMap.get(ticket.storeId) || "—",
    supplierName: ticket.supplierId ? supplierMap.get(ticket.supplierId) || ticket.supplierId : "—",
  })

  const grouped = {
    today: todayPage.tickets.map(formatTicket),
    overdue: overduePage.tickets.map(formatTicket),
    next7Days: nextPage.tickets.map(formatTicket),
  }

  // Check canPerformActions based on role
  const canPerformActions = ["COBRANCA", "ADMIN"].includes(session.role)

  return (
    <AgendaClient
      grouped={grouped}
      suppliers={suppliers}
      stores={stores}
      tenant={tenant}
      userName={session.name}
      userRole={session.role}
      canPerformActions={canPerformActions}
      initialTab={activeTab}
      nextCursors={{
        hoje: todayPage.nextCursor,
        atrasadas: overduePage.nextCursor,
        proximos: nextPage.nextCursor,
      }}
    />
  )
}
