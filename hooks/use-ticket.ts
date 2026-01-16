"use client"

import { useQuery, type QueryClient } from "@tanstack/react-query"
import type { Ticket, TimelineEntry, Attachment, AuditEntry, Supplier, Store, Status, TenantSettings } from "@/lib/schemas"
import type { NextTransitionChecklist, StageSummary } from "@/lib/types/warranty"

export interface TicketDetailData {
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

export const invalidateTicket = (queryClient: QueryClient, ticketId: string) =>
  queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] })

export function useTicket(ticketId: string, initialData?: TicketDetailData) {
  return useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/${ticketId}`)
      if (!response.ok) {
        throw new Error("Erro ao buscar ticket")
      }

      return (await response.json()) as TicketDetailData
    },
    enabled: Boolean(ticketId),
    initialData,
  })
}
