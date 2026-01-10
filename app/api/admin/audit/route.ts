import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { fetchAdminAuditEntries } from "@/lib/services/adminService"

export async function GET(request: Request) {
  try {
    const session = await requireAuth()
    if (session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const ticketId = searchParams.get("ticketId")
    const userId = searchParams.get("userId")
    const action = searchParams.get("action")

    const entries = await fetchAdminAuditEntries({
      tenantId: session.tenantId,
      startDate,
      endDate,
      ticketId,
      action,
      userId,
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("[v0] Error fetching audit:", error)
    return NextResponse.json({ error: "Erro ao buscar auditoria" }, { status: 500 })
  }
}
