import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getUserPermissions } from "@/lib/permissions"
import { type Status } from "@/lib/schemas"
import { advanceTicketStatus, revertTicketStatusWithAudit } from "@/lib/services/warrantyService"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, targetStatus, reason, supplierId, resolutionResult, resolutionNotes, supplierResponse } = body

    const permissions = getUserPermissions(session.role)

    if (action === "advance") {
      const result = await advanceTicketStatus({
        ticketId: id,
        tenantId: session.tenantId,
        role: session.role,
        userId: session.uid,
        userName: session.name,
        supplierId,
        resolutionResult,
        resolutionNotes,
        supplierResponse,
      })

      if (result.error) {
        return NextResponse.json({ error: result.error.message, missingRequirement: result.error.missing }, { status: result.status })
      }

      return NextResponse.json({ success: true, newStatus: result.nextStatus })
    }

    if (action === "revert") {
      if (!permissions.canRevertStage) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 })
      }

      if (!targetStatus || !reason) {
        return NextResponse.json({ error: "Target status and reason are required" }, { status: 400 })
      }

      const revertResult = await revertTicketStatusWithAudit({
        ticketId: id,
        tenantId: session.tenantId,
        userId: session.uid,
        userName: session.name,
        role: session.role,
        targetStatus: targetStatus as Status,
        reason,
      })

      if (revertResult.error) {
        return NextResponse.json({ error: revertResult.error.message }, { status: revertResult.status })
      }

      return NextResponse.json({ success: true, newStatus: targetStatus })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Update status error:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
