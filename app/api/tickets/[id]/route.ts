import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getUserPermissions } from "@/lib/permissions"
import { fetchTicketDetail } from "@/lib/services/warrantyService"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const permissions = getUserPermissions(session.role)
    const detail = await fetchTicketDetail({
      tenantId: session.tenantId,
      ticketId: id,
      canSeeAudit: permissions.canSeeAudit,
      role: session.role,
    })

    if (!detail) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    console.error("Get ticket error:", error)
    return NextResponse.json({ error: "Failed to get ticket" }, { status: 500 })
  }
}
