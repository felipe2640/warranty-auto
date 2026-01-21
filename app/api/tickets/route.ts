import { NextResponse } from "next/server"
import { requireTenantSession } from "@/lib/session"
import { listTickets } from "@/lib/repositories/tickets"
import { getTenantSettings, listStores } from "@/lib/repositories/admin"
import { getUserPermissions } from "@/lib/permissions"
import { createTicketWithUploads } from "@/lib/services/warrantyService"
import { type Status } from "@/lib/schemas"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const tenantSlug = formData.get("tenantSlug") as string

    const { session, tenantId } = await requireTenantSession(tenantSlug)
    const permissions = getUserPermissions(session.role)

    if (!permissions.canCreateTicket) {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 })
    }

    const result = await createTicketWithUploads({
      tenantId,
      session,
      formData,
    })

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, ticketId: result.ticketId })
  } catch (error) {
    console.error("Create ticket error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao criar ticket" } },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant é obrigatório" }, { status: 400 })
    }

    const { session, tenantId } = await requireTenantSession(tenantSlug)

    // Build filter options
    const options = {
      tenantId,
      status: searchParams.get("status") as Status | undefined,
      storeId: searchParams.get("storeId") || undefined,
      supplierId: searchParams.get("supplierId") || undefined,
      search: searchParams.get("search") || undefined,
      onlyOverdue: searchParams.get("onlyOverdue") === "true",
      onlyActionToday: searchParams.get("onlyActionToday") === "true",
      limit: searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!, 10) : 20,
      startAfter: searchParams.get("cursor") || undefined,
    }

    // If user is RECEBEDOR and policy requires, filter by their store
    const tenantSettings = await getTenantSettings(tenantId)
    if (session.role === "RECEBEDOR" && tenantSettings?.policies.recebedorOnlyOwnStore && session.storeId) {
      options.storeId = session.storeId
    }

    const result = await listTickets(options)

    // Get store names for display
    const stores = await listStores(tenantId)
    const storeMap = new Map(stores.map((s) => [s.id, s.name]))

    const ticketsWithStoreNames = result.tickets.map((ticket) => ({
      ...ticket,
      storeName: storeMap.get(ticket.storeId) || "—",
    }))

    return NextResponse.json({
      tickets: ticketsWithStoreNames,
      nextCursor: result.nextCursor,
    })
  } catch (error) {
    console.error("List tickets error:", error)
    return NextResponse.json({ error: "Erro ao listar tickets" }, { status: 500 })
  }
}
