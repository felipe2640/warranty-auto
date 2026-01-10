"use client"

import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StatusBadge } from "@/components/ui/status-badge"
import type { Ticket, Supplier, Status } from "@/lib/schemas"
import type { NextTransitionChecklist, TransitionChecklistItem } from "@/lib/types/warranty"
import { Loader2, AlertCircle, ChevronRight, Check, X } from "lucide-react"

interface AdvanceStageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket
  suppliers: Supplier[]
  onSuccess: () => void
  checklist: NextTransitionChecklist
  onRequestSupplier: () => void
  onRequestAttachment: () => void
}

const RESOLUTION_OPTIONS = [
  { value: "CREDITO", label: "Crédito" },
  { value: "TROCA", label: "Troca" },
  { value: "NEGOU", label: "Negou" },
]

export function AdvanceStageDialog({
  open,
  onOpenChange,
  ticket,
  suppliers,
  onSuccess,
  checklist,
  onRequestSupplier,
  onRequestAttachment,
}: AdvanceStageDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState<string>("")
  const [resolutionResult, setResolutionResult] = useState<string>("")
  const [resolutionNotes, setResolutionNotes] = useState<string>("")
  const [supplierResponse, setSupplierResponse] = useState<string>("")
  const supplierResponseRef = useRef<HTMLTextAreaElement>(null)
  const resolutionRef = useRef<HTMLButtonElement>(null)

  const nextStatus = checklist.nextStatus
  const checklistItems = checklist.items
  const needsSupplier = checklistItems.some((item) => item.key === "supplierId" && !item.satisfied)
  const needsSupplierResponse = checklistItems.some((item) => item.key === "supplierResponse" && !item.satisfied)
  const needsResolution = checklistItems.some((item) => item.key === "resolutionResult" && !item.satisfied)
  const roleBlocked = !checklist.canAdvance && checklistItems.every((item) => item.satisfied)
  const unresolvedItems = checklistItems.filter(
    (item) => !item.satisfied && !["supplierId", "supplierResponse", "resolutionResult"].includes(item.key),
  )
  const canSubmit =
    !roleBlocked &&
    unresolvedItems.length === 0 &&
    (!needsSupplier || !!supplierId) &&
    (!needsSupplierResponse || !!supplierResponse.trim()) &&
    (!needsResolution || !!resolutionResult)

  const handleAdvance = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const body: Record<string, unknown> = { action: "advance" }

      if (needsSupplier && supplierId) {
        body.supplierId = supplierId
      }

      if (needsResolution) {
        if (!resolutionResult) {
          setError("Resultado é obrigatório")
          setIsSubmitting(false)
          return
        }
        body.resolutionResult = resolutionResult
        body.resolutionNotes = resolutionNotes
      }

      if (needsSupplierResponse) {
        if (!supplierResponse.trim()) {
          setError("Resposta do fornecedor é obrigatória")
          setIsSubmitting(false)
          return
        }
        body.supplierResponse = supplierResponse
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
    setResolutionNotes("")
    setSupplierResponse("")
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
      supplierResponseRef.current?.focus()
      return
    }
    if (item.cta?.type === "resolution") {
      resolutionRef.current?.focus()
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

            {needsSupplierResponse && (
              <div className="space-y-2">
                <Label>Resposta do fornecedor *</Label>
                <Textarea
                  ref={supplierResponseRef}
                  value={supplierResponse}
                  onChange={(e) => setSupplierResponse(e.target.value)}
                  placeholder="Descreva a resposta do fornecedor..."
                  rows={3}
                />
              </div>
            )}

            {needsResolution && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Resultado *</Label>
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
                  <Label>Notas da resolução</Label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
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
