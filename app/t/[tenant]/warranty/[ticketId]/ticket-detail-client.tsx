"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { getUserPermissions } from "@/lib/permissions"
import type { Ticket, TimelineEntry, Attachment, AuditEntry, Supplier, Role, Status } from "@/lib/schemas"
import type { NextTransitionChecklist, StageSummary } from "@/lib/types/warranty"
import { ArrowLeft, ChevronRight, Plus, Paperclip, RotateCcw, AlertTriangle, Calendar } from "lucide-react"

interface TicketDetailClientProps {
  tenant: string
  ticket: Ticket & { storeName: string }
  timeline: TimelineEntry[]
  attachments: Attachment[]
  audit: AuditEntry[]
  suppliers: Supplier[]
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
  suppliers,
  userRole,
  userId,
  userName,
  nextTransitionChecklist,
  stageSummaryMap,
}: TicketDetailClientProps) {
  const router = useRouter()
  const permissions = getUserPermissions(userRole)

  const [ticket, setTicket] = useState(initialTicket)
  const [timeline, setTimeline] = useState(initialTimeline)
  const [attachments, setAttachments] = useState(initialAttachments)
  const [transitionChecklist, setTransitionChecklist] = useState(nextTransitionChecklist)
  const [stageSummary, setStageSummary] = useState(stageSummaryMap)

  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false)
  const [showRevertDialog, setShowRevertDialog] = useState(false)
  const [showTimelineDialog, setShowTimelineDialog] = useState(false)
  const [showAttachmentDialog, setShowAttachmentDialog] = useState(false)
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)

  const canAdvance = transitionChecklist.canAdvance
  const nextStatus = transitionChecklist.nextStatus
  const roleBlocked = !canAdvance && transitionChecklist.items.every((item) => item.satisfied)

  const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && ticket.status !== "ENCERRADO"
  const hasNextAction = ticket.nextActionAt && new Date(ticket.nextActionAt) <= new Date()

  const refreshData = async () => {
    const response = await fetch(`/api/tickets/${ticket.id}`)
    if (response.ok) {
      const data = await response.json()
      setTicket(data.ticket)
      setTimeline(data.timeline)
      setAttachments(data.attachments)
      setTransitionChecklist(data.nextTransitionChecklist)
      setStageSummary(data.stageSummaryMap)
    }
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
            <TicketAuditTab audit={initialAudit} />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialogs */}
      <AdvanceStageDialog
        open={showAdvanceDialog}
        onOpenChange={setShowAdvanceDialog}
        ticket={ticket}
        suppliers={suppliers}
        onSuccess={refreshData}
        checklist={transitionChecklist}
        onRequestSupplier={() => setShowSupplierDialog(true)}
        onRequestAttachment={() => setShowAttachmentDialog(true)}
      />

      <RevertStageDialog
        open={showRevertDialog}
        onOpenChange={setShowRevertDialog}
        ticket={ticket}
        onSuccess={refreshData}
      />

      <AddTimelineDialog
        open={showTimelineDialog}
        onOpenChange={setShowTimelineDialog}
        ticketId={ticket.id}
        canSetNextAction={permissions.canSetNextAction}
        onSuccess={refreshData}
      />

      <AddAttachmentDialog
        open={showAttachmentDialog}
        onOpenChange={setShowAttachmentDialog}
        ticketId={ticket.id}
        canAttachCanhoto={permissions.canAttachCanhoto}
        onSuccess={refreshData}
      />

      <SetSupplierDialog
        open={showSupplierDialog}
        onOpenChange={setShowSupplierDialog}
        ticketId={ticket.id}
        suppliers={suppliers}
        onSuccess={refreshData}
      />
    </div>
  )
}
