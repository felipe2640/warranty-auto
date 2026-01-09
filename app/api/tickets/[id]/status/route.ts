import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import {
  getTicketById,
  updateTicketStatus,
  revertTicketStatus,
  hasAttachmentOfCategory,
} from "@/lib/repositories/tickets"
import { getSupplierById, getTenantSettings } from "@/lib/repositories/admin"
import { getUserPermissions, canUserAdvanceStatus, STAGE_REQUIREMENTS } from "@/lib/permissions"
import { STATUS_ORDER, type Status } from "@/lib/schemas"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, targetStatus, reason, supplierId, resolutionResult, resolutionNotes } = body

    const ticket = await getTicketById(id)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    if (ticket.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const permissions = getUserPermissions(session.role)

    if (action === "advance") {
      // Check permission to advance from current status
      if (!canUserAdvanceStatus(session.role, ticket.status)) {
        return NextResponse.json({ error: "Permission denied to advance this status" }, { status: 403 })
      }

      const stageReq = STAGE_REQUIREMENTS[ticket.status]
      if (!stageReq.nextStatus) {
        return NextResponse.json({ error: "Cannot advance from this status" }, { status: 400 })
      }

      // Check requirements
      const tenantSettings = await getTenantSettings(session.tenantId)

      // INTERNO -> ENTREGA_LOGISTICA: requires supplierId
      if (ticket.status === "INTERNO" && !ticket.supplierId && !supplierId) {
        return NextResponse.json(
          { error: "Fornecedor deve estar definido", missingRequirement: "supplierId" },
          { status: 400 },
        )
      }

      // ENTREGA_LOGISTICA -> COBRANCA: requires CANHOTO attachment
      if (ticket.status === "ENTREGA_LOGISTICA" && tenantSettings?.policies.requireCanhotForCobranca) {
        const hasCanhot = await hasAttachmentOfCategory(id, "CANHOTO")
        if (!hasCanhot) {
          return NextResponse.json(
            { error: "Anexo CANHOTO é obrigatório", missingRequirement: "canhoto" },
            { status: 400 },
          )
        }
      }

      // RESOLUCAO -> ENCERRADO: requires resolution result
      if (ticket.status === "RESOLUCAO" && !resolutionResult) {
        return NextResponse.json(
          { error: "Resultado final deve ser definido", missingRequirement: "resolution" },
          { status: 400 },
        )
      }

      // Prepare additional data based on transition
      const additionalData: Partial<typeof ticket> = {}

      // If advancing from INTERNO and setting supplier
      if (ticket.status === "INTERNO" && supplierId) {
        const supplier = await getSupplierById(supplierId)
        if (supplier) {
          additionalData.supplierId = supplierId
          additionalData.supplierName = supplier.name
          additionalData.slaDays = supplier.slaDays
          // Calculate due date
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + supplier.slaDays)
          additionalData.dueDate = dueDate
        }
      }

      // If advancing from ENTREGA_LOGISTICA, set delivery date
      if (ticket.status === "ENTREGA_LOGISTICA") {
        additionalData.deliveredToSupplierAt = new Date()
      }

      // If advancing to ENCERRADO
      if (stageReq.nextStatus === "ENCERRADO") {
        additionalData.resolutionResult = resolutionResult
        additionalData.resolutionNotes = resolutionNotes
        additionalData.closedAt = new Date()
      }

      await updateTicketStatus(id, stageReq.nextStatus, session.uid, session.name, additionalData)

      return NextResponse.json({ success: true, newStatus: stageReq.nextStatus })
    }

    if (action === "revert") {
      if (!permissions.canRevertStage) {
        return NextResponse.json({ error: "Permission denied" }, { status: 403 })
      }

      if (!targetStatus || !reason) {
        return NextResponse.json({ error: "Target status and reason are required" }, { status: 400 })
      }

      const currentIndex = STATUS_ORDER.indexOf(ticket.status)
      const targetIndex = STATUS_ORDER.indexOf(targetStatus as Status)

      if (targetIndex >= currentIndex) {
        return NextResponse.json({ error: "Can only revert to a previous status" }, { status: 400 })
      }

      await revertTicketStatus(id, targetStatus as Status, session.uid, session.name, reason)

      return NextResponse.json({ success: true, newStatus: targetStatus })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Update status error:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
