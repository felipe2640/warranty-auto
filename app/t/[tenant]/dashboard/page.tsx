import { requireTenantSession } from "@/lib/session"
import { fetchDashboardData } from "@/lib/services/warrantyService"
import { fetchStores } from "@/lib/services/adminService"
import { DashboardClient } from "../dashboard-client"
import type { Ticket, Status } from "@/lib/schemas"

interface DashboardStats {
  total: number
  byStatus: Partial<Record<Status, number>>
  todayActions: number
  overdue: number
  resolved30Days: number
  todayTickets: Ticket[]
  overdueTickets: Ticket[]
}

export default async function DashboardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const { session, tenantId, tenantName } = await requireTenantSession(tenant)

  const stores = await fetchStores(tenantId)
  const storeMap = new Map(stores.map((store) => [store.id, store.name]))

  const { counts, todayTickets, overdueTickets } = await fetchDashboardData({
    tenantId,
    storeId: session.role === "RECEBEDOR" ? session.storeId : undefined,
  })

  const stats: DashboardStats = {
    total: counts.total,
    byStatus: {
      RECEBIMENTO: counts.recebimento,
      INTERNO: counts.interno,
      ENTREGA_LOGISTICA: counts.logistica,
      COBRANCA_ACOMPANHAMENTO: counts.cobranca,
      RESOLUCAO: counts.resolucao,
      ENCERRADO: counts.encerrado,
    },
    todayActions: counts.actionsToday,
    overdue: counts.overdue,
    resolved30Days: counts.resolved30Days,
    todayTickets: todayTickets.map((ticket) => ({
      ...ticket,
      storeName: storeMap.get(ticket.storeId) || "—",
    })),
    overdueTickets: overdueTickets.map((ticket) => ({
      ...ticket,
      storeName: storeMap.get(ticket.storeId) || "—",
    })),
  }

  return (
    <DashboardClient
      stats={stats}
      stores={stores}
      tenant={tenant}
      tenantName={tenantName}
      userName={session.name}
      userRole={session.role}
      userStoreId={session.storeId}
    />
  )
}
