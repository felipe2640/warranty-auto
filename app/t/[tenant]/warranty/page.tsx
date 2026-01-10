import { requireTenantSession } from "@/lib/session"
import { WarrantyListClient } from "./warranty-list-client"
import type { Ticket, Store } from "@/lib/schemas"
import { fetchTenantSettings, fetchStores } from "@/lib/services/adminService"
import { fetchWarrantyList } from "@/lib/services/warrantyService"

interface SearchParams {
  status?: string
  storeId?: string
  q?: string
  overSla?: string
  cursor?: string
}

export default async function WarrantyListPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<SearchParams>
}) {
  const { tenant } = await params
  const filters = await searchParams
  const { session, tenantId } = await requireTenantSession(tenant)

  const [stores, tenantSettings] = await Promise.all([
    fetchStores(tenantId),
    fetchTenantSettings(tenantId),
  ])

  const activeStores = stores.filter((store) => store.active)

  const effectiveStoreId =
    session.role === "RECEBEDOR" && tenantSettings?.policies.recebedorOnlyOwnStore
      ? session.storeId
      : filters.storeId

  const { tickets, nextCursor } = await fetchWarrantyList({
    tenantId,
    status: filters.status as Ticket["status"] | undefined,
    storeId: effectiveStoreId || undefined,
    search: filters.q || undefined,
    onlyOverdue: filters.overSla === "true",
    limit: 20,
    cursor: filters.cursor,
  })

  return (
    <WarrantyListClient
      tickets={tickets}
      stores={activeStores}
      tenant={tenant}
      userName={session.name}
      userRole={session.role}
      userStoreId={session.storeId}
      initialFilters={filters}
      nextCursor={nextCursor}
    />
  )
}
