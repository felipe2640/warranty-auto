import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getTicketById, addAttachment } from "@/lib/repositories/tickets"
import { getUserPermissions } from "@/lib/permissions"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Check specific attachment permissions based on category
    const formData = await request.formData()
    const category = formData.get("category") as string

    if (category === "CANHOTO" && !permissions.canAttachCanhoto) {
      return NextResponse.json({ error: "Permission denied to attach canhoto" }, { status: 403 })
    }

    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const attachmentId = await addAttachment(id, buffer, {
      name: file.name,
      mimeType: file.type,
      size: file.size,
      category,
      uploadedBy: session.uid,
      uploadedByName: session.name,
    })

    return NextResponse.json({ success: true, attachmentId })
  } catch (error) {
    console.error("Add attachment error:", error)
    return NextResponse.json({ error: "Failed to add attachment" }, { status: 500 })
  }
}
