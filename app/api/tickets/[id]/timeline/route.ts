import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { addTicketTimelineEntry } from "@/lib/services/warrantyService"
import { getUserPermissions } from "@/lib/permissions"
import { TimelineFormSchema, TimelineNextActionRequiredTypes } from "@/lib/schemas"
import { isDateOnlyString, toDateOnlyString } from "@/lib/date"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = TimelineFormSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Dados inválidos" }, { status: 400 })
    }

    const { type, text, setNextAction, nextActionAt, nextActionNote } = parsed.data

    const permissions = getUserPermissions(session.role)
    const requiresNextAction = TimelineNextActionRequiredTypes.includes(type as (typeof TimelineNextActionRequiredTypes)[number])
    const shouldSetNextAction = requiresNextAction || setNextAction

    if (!permissions.canAddTimeline) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    // Check permission for setting next action
    if (shouldSetNextAction && !permissions.canSetNextAction) {
      return NextResponse.json({ error: "Permission denied to set next action" }, { status: 403 })
    }

    const nextActionDate = shouldSetNextAction && nextActionAt ? toDateOnlyString(nextActionAt) : undefined
    if (shouldSetNextAction && (!nextActionDate || !isDateOnlyString(nextActionDate))) {
      return NextResponse.json({ error: "Data da próxima ação é inválida" }, { status: 400 })
    }

    const trimmedNote = nextActionNote?.trim()

    const entryId = await addTicketTimelineEntry({
      ticketId: id,
      tenantId: session.tenantId,
      entry: {
        type,
        text,
        userId: session.uid,
        userName: session.name,
        nextActionAt: nextActionDate,
        nextActionNote: shouldSetNextAction ? trimmedNote : undefined,
      },
      updateNextAction: shouldSetNextAction && nextActionDate
        ? {
          nextActionAt: nextActionDate,
          nextActionNote: trimmedNote,
        }
        : undefined,
    })

    if (!entryId) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, entryId })
  } catch (error) {
    console.error("Add timeline error:", error)
    return NextResponse.json({ error: "Failed to add timeline entry" }, { status: 500 })
  }
}
