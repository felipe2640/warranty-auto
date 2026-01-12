import type { Ticket, UpdateTicketDetailsInput } from "@/lib/schemas"

export type TicketEditableField = keyof UpdateTicketDetailsInput

export function diffEditableFields(ticket: Ticket, patch: UpdateTicketDetailsInput) {
  const changedFields: Record<string, { from: unknown; to: unknown }> = {}

  ;(Object.keys(patch) as TicketEditableField[]).forEach((key) => {
    const nextValue = patch[key]
    if (nextValue === undefined) return

    const currentValue = ticket[key as keyof Ticket]
    const fromValue = currentValue ?? null
    const toValue = nextValue ?? null

    if (fromValue !== toValue) {
      changedFields[key] = { from: fromValue, to: toValue }
    }
  })

  return changedFields
}
