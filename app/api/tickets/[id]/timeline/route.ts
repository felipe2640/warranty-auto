import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getTicketById, addTimelineEntry } from "@/lib/repositories/tickets"
import { getUserPermissions } from "@/lib/permissions"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { type, text, setNextAction, nextActionAt, nextActionNote } = body

    const ticket = await getTicketById(id)
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    if (ticket.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const permissions = getUserPermissions(session.role)

    if (!permissions.canAddTimeline) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    // Check permission for setting next action
    if (setNextAction && !permissions.canSetNextAction) {
      return NextResponse.json({ error: "Permission denied to set next action" }, { status: 403 })
    }

    const entryId = await addTimelineEntry(
      id,
      {
        type,
        text,
        userId: session.uid,
        userName: session.name,
        nextActionAt: setNextAction && nextActionAt ? new Date(nextActionAt) : undefined,
        nextActionNote: setNextAction ? nextActionNote : undefined,
      },
      setNextAction && nextActionAt
        ? {
            nextActionAt: new Date(nextActionAt),
            nextActionNote,
          }
        : undefined,
    )

    return NextResponse.json({ success: true, entryId })
  } catch (error) {
    console.error("Add timeline error:", error)
    return NextResponse.json({ error: "Failed to add timeline entry" }, { status: 500 })
  }
}
