"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Stepper } from "@/components/warranty/stepper"
import { TicketSummaryTab } from "./tabs/summary-tab"
import { TicketTimelineTab } from "./tabs/timeline-tab"
import { TicketAttachmentsTab } from "./tabs/attachments-tab"
import { TicketAuditTab } from "./tabs/audit-tab"
import { AdvanceStageDialog } from "./dialogs/advance-stage-dialog"
import { RevertStageDialog } from "./dialogs/revert-stage-dialog"
import { AddTimelineDialog } from "./dialogs/add-timeline-dialog"
import { AddAttachmentDialog } from "./dialogs/add-attachment-dialog"
import { SetSupplierDialog } from "./dialogs/set-supplier-dialog"
import { EditTicketDialog } from "./dialogs/edit-ticket-dialog"
import { invalidateTicket, useTicket, type TicketDetailData } from "@/hooks/use-ticket"
import { getUserPermissions } from "@/lib/permissions"
import type { Ticket, TimelineEntry, Attachment, AuditEntry, Supplier, Role, Status, Store, TenantSettings } from "@/lib/schemas"
import type { NextTransitionChecklist, StageSummary } from "@/lib/types/warranty"
import { ArrowLeft, ChevronRight, Plus, Paperclip, RotateCcw, AlertTriangle, Calendar, Pencil } from "lucide-react"
import { todayDateOnly } from "@/lib/date"

interface TicketDetailClientProps {
  tenant: string
  ticket: Ticket & { storeName: string }
  timeline: TimelineEntry[]
  attachments: Attachment[]
  audit: AuditEntry[]
  suppliers: Supplier[]
  stores: Store[]
  tenantPolicies?: TenantSettings["policies"] | null
  userRole: Role
  userId: string
  userName: string
  nextTransitionChecklist: NextTransitionChecklist
  stageSummaryMap: Record<Status, StageSummary>
}

export function TicketDetailClient({
  tenant,
  ticket: initialTicket,
  timeline: initialTimeline,
  attachments: initialAttachments,
  audit: initialAudit,
  suppliers: initialSuppliers,
  stores: initialStores,
  tenantPolicies,
  userRole,
  userId,
  userName,
  nextTransitionChecklist,
  stageSummaryMap,
}: TicketDetailClientProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const permissions = getUserPermissions(userRole)
  const ticketId = initialTicket.id

  const initialData: TicketDetailData = {
    ticket: initialTicket,
    timeline: initialTimeline,
    attachments: initialAttachments,
    audit: initialAudit,
    suppliers: initialSuppliers,
    stores: initialStores,
    nextTransitionChecklist,
    stageSummaryMap,
  }

  const { data: ticketData } = useTicket(ticketId, initialData)
  const ticket = ticketData?.ticket ?? initialTicket
  const timeline = ticketData?.timeline ?? initialTimeline
  const attachments = ticketData?.attachments ?? initialAttachments
  const transitionChecklist = ticketData?.nextTransitionChecklist ?? nextTransitionChecklist
  const stageSummary = ticketData?.stageSummaryMap ?? stageSummaryMap
  const audit = ticketData?.audit ?? initialAudit
  const suppliers = ticketData?.suppliers ?? initialSuppliers
  const stores = ticketData?.stores ?? initialStores

  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false)
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [showTimelineDialog, setShowTimelineDialog] = useState(false)
  const [showAttachmentDialog, setShowAttachmentDialog] = useState(false)
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const allowStoreChange = tenantPolicies ? !tenantPolicies.recebedorOnlyOwnStore : true
  const canEditCustomer = userRole === "ADMIN" || userRole === "RECEBEDOR"
  const canEditPiece = userRole === "ADMIN" || userRole === "RECEBEDOR" || userRole === "INTERNO"
  const canEditStore = userRole === "ADMIN" || (userRole === "INTERNO" && allowStoreChange)
  const canEditSupplier = userRole === "ADMIN" || userRole === "INTERNO"
  const canEditTicket = canEditCustomer || canEditPiece || canEditStore || canEditSupplier

  const canAdvance = transitionChecklist.canAdvance
  const nextStatus = transitionChecklist.nextStatus
  const roleBlocked = !canAdvance && transitionChecklist.items.every((item) => item.satisfied)

  const today = todayDateOnly()
  const isOverdue = ticket.dueDate && ticket.dueDate < today && ticket.status !== "ENCERRADO"
  const hasNextAction = ticket.nextActionAt && ticket.nextActionAt <= today

  const handleTicketUpdated = (updatedTicket: Ticket & { storeName?: string; supplierName?: string }, timelineEntry?: TimelineEntry) => {
    queryClient.setQueryData<TicketDetailData>(["ticket", ticketId], (previous) => {
      if (!previous) {
        return previous
      }

      const nextTicket = {
        ...previous.ticket,
        ...updatedTicket,
        storeName: updatedTicket.storeName ?? previous.ticket.storeName,
        supplierName: updatedTicket.supplierName ?? previous.ticket.supplierName,
      }

      return {
        ...previous,
        ticket: nextTicket,
        timeline: timelineEntry ? [timelineEntry, ...previous.timeline] : previous.timeline,
      }
    })
  }

  const formatShortId = (id: string) => {
    return id.substring(0, 8).toUpperCase()
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border md:top-0">
        <div className="p-4 space-y-3">
          {/* Top row: Back + ID + Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <h1 className="text-lg font-bold text-foreground">Ticket #{formatShortId(ticket.id)}</h1>

            <StatusBadge status={ticket.status} />

            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Atrasado
              </Badge>
            )}

            {hasNextAction && (
              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                <Calendar className="h-3 w-3 mr-1" />
                Ação pendente
              </Badge>
            )}
          </div>

          {/* Second row: Client info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">{ticket.nomeRazaoSocial}</span>
            <span>•</span>
            <span>{ticket.storeName}</span>
            {ticket.supplierName && ticket.supplierName !== "—" && (
              <>
                <span>•</span>
                <span>{ticket.supplierName}</span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canEditTicket && (
              <Button size="sm" variant="outline" onClick={() => setShowEditDialog(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}

            {nextStatus && !roleBlocked && (
              <Button size="sm" onClick={() => setShowAdvanceDialog(true)}>
                Avançar etapa
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}

            {permissions.canAddTimeline && (
              <Button size="sm" variant="outline" onClick={() => setShowTimelineDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Registro
              </Button>
            )}

            {(permissions.canAttachCanhoto || permissions.canCreateTicket) && (
              <Button size="sm" variant="outline" onClick={() => setShowAttachmentDialog(true)}>
                <Paperclip className="h-4 w-4 mr-1" />
                Anexar
              </Button>
            )}

            {permissions.canRevertStage && ticket.status !== "RECEBIMENTO" && (
              <Button size="sm" variant="ghost" onClick={() => setShowRevertDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="p-4 border-b border-border bg-muted/30">
        <Stepper currentStatus={ticket.status} stageHistory={ticket.stageHistory} stageSummaryMap={stageSummary} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo" className="p-4">
        <TabsList className="w-full grid grid-cols-4 md:w-auto md:inline-flex">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
          {permissions.canSeeAudit && <TabsTrigger value="auditoria">Auditoria</TabsTrigger>}
        </TabsList>

        <TabsContent value="resumo" className="mt-4">
          <TicketSummaryTab
            ticket={ticket}
            canSetNextAction={permissions.canSetNextAction}
            canDefineSupplier={permissions.canDefineSupplier && !ticket.supplierId}
            onSetSupplier={() => setShowSupplierDialog(true)}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <TicketTimelineTab
            timeline={timeline}
            canAddEntry={permissions.canAddTimeline}
            onAddEntry={() => setShowTimelineDialog(true)}
          />
        </TabsContent>

        <TabsContent value="anexos" className="mt-4">
          <TicketAttachmentsTab
            attachments={attachments}
            canUpload={permissions.canAttachCanhoto || permissions.canCreateTicket}
            onUpload={() => setShowAttachmentDialog(true)}
          />
        </TabsContent>

        {permissions.canSeeAudit && (
          <TabsContent value="auditoria" className="mt-4">
            <TicketAuditTab audit={audit} />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <AdvanceStageDialog
        open={showAdvanceDialog}
        onOpenChange={setShowAdvanceDialog}
        ticket={ticket}
        suppliers={suppliers}
        onSuccess={() => invalidateTicket(queryClient, ticket.id)}
        checklist={transitionChecklist}
        onRequestSupplier={() => setShowSupplierDialog(true)}
        onRequestAttachment={() => setShowAttachmentDialog(true)}
      />

      <RevertStageDialog
        open={showRevertDialog}
        onOpenChange={setShowRevertDialog}
        ticket={ticket}
        onSuccess={() => invalidateTicket(queryClient, ticket.id)}
      />

      <AddTimelineDialog
        open={showTimelineDialog}
        onOpenChange={setShowTimelineDialog}
        ticketId={ticket.id}
        canSetNextAction={permissions.canSetNextAction}
        onSuccess={() => invalidateTicket(queryClient, ticket.id)}
      />

      <AddAttachmentDialog
        open={showAttachmentDialog}
        onOpenChange={setShowAttachmentDialog}
        ticketId={ticket.id}
        canAttachCanhoto={permissions.canAttachCanhoto}
        onSuccess={() => invalidateTicket(queryClient, ticket.id)}
      />

      <SetSupplierDialog
        open={showSupplierDialog}
        onOpenChange={setShowSupplierDialog}
        ticketId={ticket.id}
        suppliers={suppliers}
        onSuccess={() => invalidateTicket(queryClient, ticket.id)}
      />

      <EditTicketDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        ticket={ticket}
        stores={stores}
        suppliers={suppliers}
        canEditCustomer={canEditCustomer}
        canEditPiece={canEditPiece}
        canEditStore={canEditStore}
        canEditSupplier={canEditSupplier}
        onUpdated={handleTicketUpdated}
      />
    </div>
  )
}
