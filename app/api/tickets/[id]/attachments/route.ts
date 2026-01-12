import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { addTicketAttachment, advanceTicketStatus } from "@/lib/services/warrantyService"
import { getUserPermissions } from "@/lib/permissions"
import { AttachmentCategoryEnum } from "@/lib/schemas"
import { getTicketById } from "@/lib/repositories/tickets"

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024

type AttachmentErrorPayload = {
  code: string
  message: string
  details?: string
}

function errorResponse(code: string, message: string, status: number, details?: string) {
  const payload: AttachmentErrorPayload = { code, message }
  if (details) {
    payload.details = details
  }
  return NextResponse.json({ error: payload }, { status })
}

function mapAttachmentError(error: unknown) {
  if (error && typeof error === "object") {
    const err = error as { code?: number; status?: number; message?: string; response?: { status?: number } }
    const status = err.code ?? err.status ?? err.response?.status
    if (status === 403) {
      return { code: "DRIVE_PERMISSION_DENIED", message: "Permissão negada no Google Drive", status: 403 }
    }
    if (status === 404) {
      return { code: "DRIVE_FOLDER_NOT_FOUND", message: "Pasta do Drive não encontrada", status: 400 }
    }
    if (status === 413) {
      return { code: "FILE_TOO_LARGE", message: "Arquivo muito grande", status: 413 }
    }
  }

  return { code: "ATTACHMENT_FAILED", message: "Falha ao anexar arquivo", status: 500 }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return errorResponse("UNAUTHORIZED", "Não autorizado", 401)
    }

    const { id } = await params

    const permissions = getUserPermissions(session.role)

    // Check specific attachment permissions based on category
    const formData = await request.formData()
    const category = formData.get("category") as string

    if (!category) {
      return errorResponse("CATEGORY_REQUIRED", "Categoria do anexo é obrigatória", 400)
    }

    const categoryValidation = AttachmentCategoryEnum.safeParse(category)
    if (!categoryValidation.success) {
      return errorResponse("CATEGORY_INVALID", "Categoria do anexo inválida", 400)
    }

    if (category === "CANHOTO" && !permissions.canAttachCanhoto) {
      return errorResponse("FORBIDDEN", "Permissão insuficiente para anexar canhoto", 403)
    }

    const file = formData.get("file") as File
    if (!file) {
      return errorResponse("FILE_REQUIRED", "Arquivo é obrigatório", 400)
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return errorResponse("FILE_TOO_LARGE", "Arquivo muito grande (máx. 20MB)", 413)
    }

    const ticket = await getTicketById(id)
    if (!ticket) {
      return errorResponse("TICKET_NOT_FOUND", "Ticket não encontrado", 404)
    }

    if (ticket.tenantId !== session.tenantId) {
      return errorResponse("TENANT_MISMATCH", "Acesso negado ao ticket", 403)
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await addTicketAttachment({
      ticketId: id,
      tenantId: session.tenantId,
      ticket,
      file: buffer,
      metadata: {
        name: file.name,
        mimeType: file.type,
        size: file.size,
        category,
        uploadedBy: session.uid,
        uploadedByName: session.name,
      },
    })

    if (!result) {
      return errorResponse("TICKET_NOT_FOUND", "Ticket não encontrado", 404)
    }

    let autoAdvanced = false
    let newStatus: string | undefined
    let reason: string | undefined

    if (category === "CANHOTO" && ticket.status === "ENTREGA_LOGISTICA") {
      const advanceResult = await advanceTicketStatus({
        ticketId: id,
        tenantId: session.tenantId,
        role: session.role,
        userId: session.uid,
        userName: session.name,
      })

      if (advanceResult.error) {
        autoAdvanced = false
        reason = advanceResult.error.message
      } else {
        autoAdvanced = true
        newStatus = advanceResult.nextStatus
      }
    }

    return NextResponse.json({
      success: true,
      attachmentId: result.attachmentId,
      autoAdvanced,
      newStatus,
      reason,
    })
  } catch (error) {
    console.error("Add attachment error:", error)
    const mapped = mapAttachmentError(error)
    return errorResponse(mapped.code, mapped.message, mapped.status)
  }
}
