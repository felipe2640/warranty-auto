"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StatusBadge } from "@/components/ui/status-badge"
import type { Ticket, Supplier, Status, TimelineEntry } from "@/lib/schemas"
import type { NextTransitionChecklist, TransitionChecklistItem } from "@/lib/types/warranty"
import { formatDateBR } from "@/lib/format"
import { Loader2, AlertCircle, ChevronRight, Check, X } from "lucide-react"

interface AdvanceStageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket
  suppliers: Supplier[]
  timeline: TimelineEntry[]
  onSuccess: () => void
  checklist: NextTransitionChecklist
  onRequestSupplier: () => void
  onRequestAttachment: () => void
  onRequestEdit: () => void
}

const RESOLUTION_OPTIONS = [
  { value: "CREDITO", label: "Crédito" },
  { value: "TROCA", label: "Troca" },
  { value: "NEGOU", label: "Negou" },
]
const NOTE_MAX_LENGTH = 500
const SUPPLIER_RESPONSE_TYPES = new Set(["DOCUMENTO", "EMAIL", "LIGACAO", "OBS"])
const TIMELINE_TYPE_LABELS: Record<string, string> = {
  OBS: "Observação",
  LIGACAO: "Ligação",
  EMAIL: "Email",
  PRAZO: "Prazo",
  STATUS_CHANGE: "Mudança de Status",
  DOCUMENTO: "Documento",
}

export function AdvanceStageDialog({
  open,
  onOpenChange,
  ticket,
  suppliers,
  timeline,
  onSuccess,
  checklist,
  onRequestSupplier,
  onRequestAttachment,
  onRequestEdit,
}: AdvanceStageDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState<string>("")
  const [resolutionResult, setResolutionResult] = useState<string>("")
  const [resolutionNoteChoice, setResolutionNoteChoice] = useState<string>("manual")
  const [resolutionNoteText, setResolutionNoteText] = useState<string>("")
  const [supplierResponseChoice, setSupplierResponseChoice] = useState<string>("manual")
  const [supplierResponseText, setSupplierResponseText] = useState<string>("")
  const [note, setNote] = useState<string>("")
  const supplierResponseRef = useRef<HTMLTextAreaElement>(null)
  const supplierResponseSelectRef = useRef<HTMLButtonElement>(null)
  const resolutionRef = useRef<HTMLButtonElement>(null)

  const nextStatus = checklist.nextStatus
  const checklistItems = checklist.items
  const needsSupplier = checklistItems.some((item) => item.key === "supplierId" && !item.satisfied)
  const needsSupplierResponse = checklistItems.some((item) => item.key === "supplierResponse" && !item.satisfied)
  const needsResolution = checklistItems.some((item) => item.key === "resolutionResult" && !item.satisfied)
  const showSupplierResponse = ticket.status === "COBRANCA_ACOMPANHAMENTO"
  const showResolutionFields = ticket.status === "RESOLUCAO"
  const roleBlocked = !checklist.canAdvance && checklistItems.every((item) => item.satisfied)
  const unresolvedItems = checklistItems.filter(
    (item) => !item.satisfied && !["supplierId", "supplierResponse", "resolutionResult"].includes(item.key),
  )
  const timelineResponseEntries = useMemo(
    () => timeline.filter((entry) => SUPPLIER_RESPONSE_TYPES.has(entry.type)),
    [timeline],
  )
  const timelineResponseMap = useMemo(
    () => new Map(timelineResponseEntries.map((entry) => [entry.id, entry])),
    [timelineResponseEntries],
  )
  const resolvedSupplierResponse = supplierResponseChoice.startsWith("timeline:")
    ? supplierResponseChoice
    : supplierResponseText.trim()
  const resolvedResolutionNotes = resolutionNoteChoice.startsWith("timeline:")
    ? resolutionNoteChoice
    : resolutionNoteText.trim()
  const hasSupplierResponse = !!resolvedSupplierResponse
  const canSubmit =
    !roleBlocked &&
    unresolvedItems.length === 0 &&
    (!needsSupplier || !!supplierId) &&
    (!showSupplierResponse || hasSupplierResponse) &&
    (!showResolutionFields || !!resolutionResult)

  useEffect(() => {
    if (!open) return

    const currentResponse = ticket.supplierResponse?.trim()
    if (!currentResponse) {
      setSupplierResponseChoice("manual")
      setSupplierResponseText("")
    } else if (currentResponse.startsWith("timeline:")) {
      const id = currentResponse.replace("timeline:", "")
      if (timelineResponseMap.has(id)) {
        setSupplierResponseChoice(currentResponse)
        setSupplierResponseText("")
      } else {
        setSupplierResponseChoice("manual")
        setSupplierResponseText(currentResponse)
      }
    } else if (timelineResponseMap.has(currentResponse)) {
      setSupplierResponseChoice(`timeline:${currentResponse}`)
      setSupplierResponseText("")
    } else {
      setSupplierResponseChoice("manual")
      setSupplierResponseText(currentResponse)
    }

    const currentResolutionResult = ticket.resolutionResult?.toString() ?? ""
    setResolutionResult(currentResolutionResult)

    const currentResolutionNotes = ticket.resolutionNotes?.trim()
    if (!currentResolutionNotes) {
      setResolutionNoteChoice("manual")
      setResolutionNoteText("")
      return
    }

    if (currentResolutionNotes.startsWith("timeline:")) {
      const id = currentResolutionNotes.replace("timeline:", "")
      if (timelineResponseMap.has(id)) {
        setResolutionNoteChoice(currentResolutionNotes)
        setResolutionNoteText("")
        return
      }
    }

    if (timelineResponseMap.has(currentResolutionNotes)) {
      setResolutionNoteChoice(`timeline:${currentResolutionNotes}`)
      setResolutionNoteText("")
      return
    }

    setResolutionNoteChoice("manual")
    setResolutionNoteText(currentResolutionNotes)
  }, [open, ticket.supplierResponse, ticket.resolutionResult, ticket.resolutionNotes, timelineResponseMap])

  const handleAdvance = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const body: Record<string, unknown> = { action: "advance" }

      if (note.trim().length > NOTE_MAX_LENGTH) {
        setError(`Observação deve ter no máximo ${NOTE_MAX_LENGTH} caracteres`)
        setIsSubmitting(false)
        return
      }

      if (needsSupplier && supplierId) {
        body.supplierId = supplierId
      }

      if (showResolutionFields) {
        if (!resolutionResult) {
          setError("Resultado é obrigatório")
          setIsSubmitting(false)
          return
        }
        body.resolutionResult = resolutionResult
        if (resolvedResolutionNotes) {
          body.resolutionNotes = resolvedResolutionNotes
        }
      }

      if (showSupplierResponse) {
        if (!hasSupplierResponse) {
          setError("Resposta do fornecedor é obrigatória")
          setIsSubmitting(false)
          return
        }
        body.supplierResponse = resolvedSupplierResponse
      }

      if (note.trim()) {
        body.note = note.trim()
      }

      const response = await fetch(`/api/tickets/${ticket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao avançar etapa")
        return
      }

      onSuccess()
      onOpenChange(false)
    } catch {
      setError("Erro ao avançar etapa")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetState = () => {
    setError(null)
    setSupplierId("")
    setResolutionResult("")
    setResolutionNoteChoice("manual")
    setResolutionNoteText("")
    setSupplierResponseChoice("manual")
    setSupplierResponseText("")
    setNote("")
  }

  const handleChecklistCta = (item: TransitionChecklistItem) => {
    if (item.cta?.type === "supplier") {
      onRequestSupplier()
      onOpenChange(false)
      return
    }
    if (item.cta?.type === "attachment") {
      onRequestAttachment()
      onOpenChange(false)
      return
    }
    if (item.cta?.type === "supplierResponse") {
      supplierResponseSelectRef.current?.focus()
      return
    }
    if (item.cta?.type === "resolution") {
      resolutionRef.current?.focus()
    }
    if (item.cta?.type === "editInternal") {
      onRequestEdit()
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetState()
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avançar Etapa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status transition */}
          <div className="flex items-center justify-center gap-3">
            <StatusBadge status={ticket.status} />
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
            {nextStatus && <StatusBadge status={nextStatus as Status} />}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Requirements checklist */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Requisitos:</Label>

            {needsSupplier && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {supplierId ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  <span>Fornecedor definido</span>
                </div>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} (SLA: {supplier.slaDays}d)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showSupplierResponse && (
              <div className="space-y-2">
                <Label>Resposta do fornecedor {needsSupplierResponse ? "*" : ""}</Label>
                <Select
                  value={supplierResponseChoice}
                  onValueChange={(value) => {
                    setSupplierResponseChoice(value)
                    if (value !== "manual") {
                      setSupplierResponseText("")
                    }
                  }}
                >
                  <SelectTrigger ref={supplierResponseSelectRef}>
                    <SelectValue placeholder="Selecione um registro da timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Digitar resposta manual</SelectItem>
                    {timelineResponseEntries.map((entry) => {
                      const label = TIMELINE_TYPE_LABELS[entry.type] ?? entry.type
                      const shortText = entry.text.length > 60 ? `${entry.text.slice(0, 60)}…` : entry.text
                      const dateLabel = formatDateBR(entry.createdAt)
                      return (
                        <SelectItem key={entry.id} value={`timeline:${entry.id}`}>
                          {label} • {dateLabel} • {shortText}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {supplierResponseChoice === "manual" && (
                  <Textarea
                    ref={supplierResponseRef}
                    value={supplierResponseText}
                    onChange={(e) => setSupplierResponseText(e.target.value)}
                    placeholder="Descreva a resposta do fornecedor..."
                    rows={3}
                  />
                )}
              </div>
            )}

            {showResolutionFields && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Resultado {needsResolution ? "*" : ""}</Label>
                  <Select value={resolutionResult} onValueChange={setResolutionResult}>
                    <SelectTrigger ref={resolutionRef}>
                      <SelectValue placeholder="Selecione o resultado" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTION_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Registro da solução (opcional)</Label>
                  <Select
                    value={resolutionNoteChoice}
                    onValueChange={(value) => {
                      setResolutionNoteChoice(value)
                      if (value !== "manual") {
                        setResolutionNoteText("")
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um registro da timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Digitar observação manual</SelectItem>
                      {timelineResponseEntries.map((entry) => {
                        const label = TIMELINE_TYPE_LABELS[entry.type] ?? entry.type
                        const shortText = entry.text.length > 60 ? `${entry.text.slice(0, 60)}…` : entry.text
                        const dateLabel = formatDateBR(entry.createdAt)
                        return (
                          <SelectItem key={entry.id} value={`timeline:${entry.id}`}>
                            {label} • {dateLabel} • {shortText}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {resolutionNoteChoice === "manual" && (
                    <Textarea
                      value={resolutionNoteText}
                      onChange={(e) => setResolutionNoteText(e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={3}
                    />
                  )}
                </div>
              </div>
            )}

            {checklistItems.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum requisito adicional.</p>
            )}

            {checklistItems.length > 0 && (
              <div className="space-y-2 rounded-md border border-border p-3">
                {checklistItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      {item.satisfied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                      <span>{item.label}</span>
                    </div>
                    {item.cta && !item.satisfied && (
                      <Button type="button" variant="link" size="sm" onClick={() => handleChecklistCta(item)}>
                        {item.cta.label}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Observação (vai para a timeline)</Label>
              <span className="text-xs text-muted-foreground">
                {note.length}/{NOTE_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional"
              rows={3}
              maxLength={NOTE_MAX_LENGTH}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleAdvance} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Avançando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
