import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getTicketById, getTicketTimeline, getTicketAttachments, getTicketAudit } from "@/lib/repositories/tickets"
import { listStores, listSuppliers } from "@/lib/repositories/admin"
import { getUserPermissions } from "@/lib/permissions"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const ticket = await getTicketById(id)

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    if (ticket.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const permissions = getUserPermissions(session.role)

    // Get related data in parallel
    const [timeline, attachments, stores, suppliers, audit] = await Promise.all([
      getTicketTimeline(id),
      getTicketAttachments(id),
      listStores(session.tenantId),
      listSuppliers(session.tenantId),
      permissions.canSeeAudit ? getTicketAudit(id) : Promise.resolve([]),
    ])

    const store = stores.find((s) => s.id === ticket.storeId)
    const supplier = ticket.supplierId ? suppliers.find((s) => s.id === ticket.supplierId) : null

    return NextResponse.json({
      ticket: {
        ...ticket,
        storeName: store?.name || "—",
        supplierName: supplier?.name || ticket.supplierName || "—",
      },
      timeline,
      attachments,
      audit,
      stores,
      suppliers: suppliers.filter((s) => s.active),
    })
  } catch (error) {
    console.error("Get ticket error:", error)
    return NextResponse.json({ error: "Failed to get ticket" }, { status: 500 })
  }
}
