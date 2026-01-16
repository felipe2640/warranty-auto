"use client"

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import type { Attachment, AuditEntry, Supplier, Store, TenantSettings, Ticket, TimelineEntry, Status } from "@/lib/schemas"
import type { NextTransitionChecklist, StageSummary } from "@/lib/types/warranty"

export interface TicketDetailResponse {
  ticket: Ticket & { storeName: string; supplierName?: string }
  timeline: TimelineEntry[]
  attachments: Attachment[]
  audit: AuditEntry[]
  suppliers: Supplier[]
  stores: Store[]
  tenantSettings?: TenantSettings | null
  nextTransitionChecklist: NextTransitionChecklist
  stageSummaryMap: Record<Status, StageSummary>
}

export const ticketQueryKey = (ticketId: string) => ["ticket", ticketId] as const

async function fetchTicketDetail(ticketId: string): Promise<TicketDetailResponse> {
  const response = await fetch(`/api/tickets/${ticketId}`)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "Erro ao carregar ticket"
    throw new Error(message)
  }

  return data as TicketDetailResponse
}

export function useTicket(ticketId: string, initialData?: TicketDetailResponse) {
  return useQuery({
    queryKey: ticketQueryKey(ticketId),
    queryFn: () => fetchTicketDetail(ticketId),
    enabled: Boolean(ticketId),
    initialData,
  })
}

export function invalidateTicket(queryClient: QueryClient, ticketId: string) {
  return queryClient.invalidateQueries({ queryKey: ticketQueryKey(ticketId) })
}

export function useInvalidateTicket() {
  const queryClient = useQueryClient()
  return (ticketId: string) => invalidateTicket(queryClient, ticketId)
}
