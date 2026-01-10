import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { addTicketAttachment } from "@/lib/services/warrantyService"
import { getUserPermissions } from "@/lib/permissions"
import { AttachmentCategoryEnum } from "@/lib/schemas"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const permissions = getUserPermissions(session.role)

    // Check specific attachment permissions based on category
    const formData = await request.formData()
    const category = formData.get("category") as string

    if (!category) {
      return NextResponse.json({ error: "Categoria do anexo é obrigatória" }, { status: 400 })
    }

    const categoryValidation = AttachmentCategoryEnum.safeParse(category)
    if (!categoryValidation.success) {
      return NextResponse.json({ error: "Categoria do anexo inválida" }, { status: 400 })
    }

    if (category === "CANHOTO" && !permissions.canAttachCanhoto) {
      return NextResponse.json({ error: "Permission denied to attach canhoto" }, { status: 403 })
    }

    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const attachmentId = await addTicketAttachment({
      ticketId: id,
      tenantId: session.tenantId,
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

    if (!attachmentId) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, attachmentId })
  } catch (error) {
    console.error("Add attachment error:", error)
    return NextResponse.json({ error: "Failed to add attachment" }, { status: 500 })
  }
}
