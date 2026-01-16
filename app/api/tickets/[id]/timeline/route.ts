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
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = TimelineFormSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Dados inválidos" }, { status: 400 })
    }

    const { type, text, setNextAction, clearNextAction, nextActionAt, nextActionNote } = parsed.data

    const permissions = getUserPermissions(session.role)
    const requiresNextAction = TimelineNextActionRequiredTypes.includes(type as (typeof TimelineNextActionRequiredTypes)[number])
    const shouldSetNextAction = requiresNextAction || setNextAction
    const shouldClearNextAction = !shouldSetNextAction && clearNextAction

    if (!permissions.canAddTimeline) {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 })
    }

    // Check permission for setting next action
    if ((shouldSetNextAction || shouldClearNextAction) && !permissions.canSetNextAction) {
      return NextResponse.json({ error: "Permissão negada para definir próxima ação" }, { status: 403 })
    }

    const nextActionDate = shouldSetNextAction && nextActionAt ? toDateOnlyString(nextActionAt) : undefined
    if (shouldSetNextAction && (!nextActionDate || !isDateOnlyString(nextActionDate))) {
      return NextResponse.json({ error: "Data da próxima ação é inválida" }, { status: 400 })
    }

    const trimmedNote = nextActionNote?.trim()
    const updateNextAction = shouldSetNextAction && nextActionDate
      ? {
        nextActionAt: nextActionDate,
        nextActionNote: trimmedNote,
      }
      : shouldClearNextAction
        ? { nextActionAt: null, nextActionNote: null }
        : undefined

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
      updateNextAction,
    })

    if (!entryId) {
      return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, entryId })
  } catch (error) {
    console.error("Add timeline error:", error)
    return NextResponse.json({ error: "Erro ao adicionar registro na timeline" }, { status: 500 })
  }
}
