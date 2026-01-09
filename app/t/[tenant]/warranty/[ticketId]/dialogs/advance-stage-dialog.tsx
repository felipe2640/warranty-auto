"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StatusBadge } from "@/components/ui/status-badge"
import { STAGE_REQUIREMENTS } from "@/lib/permissions"
import type { Ticket, Supplier, Status } from "@/lib/schemas"
import { Loader2, AlertCircle, ChevronRight, Check, X } from "lucide-react"

interface AdvanceStageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket
  suppliers: Supplier[]
  onSuccess: () => void
}

const RESOLUTION_OPTIONS = [
  "Aprovada - Troca",
  "Aprovada - Reparo",
  "Aprovada - Crédito",
  "Recusada - Mau uso",
  "Recusada - Prazo expirado",
  "Recusada - Sem defeito",
  "Outro",
]

export function AdvanceStageDialog({ open, onOpenChange, ticket, suppliers, onSuccess }: AdvanceStageDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState<string>("")
  const [resolutionResult, setResolutionResult] = useState<string>("")
  const [resolutionNotes, setResolutionNotes] = useState<string>("")

  const stageReq = STAGE_REQUIREMENTS[ticket.status]
  const nextStatus = stageReq.nextStatus

  const requirements = {
    needsSupplier: ticket.status === "INTERNO" && !ticket.supplierId,
    needsCanhoto: ticket.status === "ENTREGA_LOGISTICA",
    needsResolution: ticket.status === "RESOLUCAO",
  }

  const handleAdvance = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      const body: Record<string, unknown> = { action: "advance" }

      if (requirements.needsSupplier && supplierId) {
        body.supplierId = supplierId
      }

      if (requirements.needsResolution) {
        if (!resolutionResult) {
          setError("Resultado é obrigatório")
          setIsSubmitting(false)
          return
        }
        body.resolutionResult = resolutionResult
        body.resolutionNotes = resolutionNotes
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

            {requirements.needsSupplier && (
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

            {requirements.needsCanhoto && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span>Anexo CANHOTO será verificado</span>
              </div>
            )}

            {requirements.needsResolution && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Resultado *</Label>
                  <Select value={resolutionResult} onValueChange={setResolutionResult}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o resultado" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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

            {!requirements.needsSupplier && !requirements.needsCanhoto && !requirements.needsResolution && (
              <p className="text-sm text-muted-foreground">Nenhum requisito adicional.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleAdvance} disabled={isSubmitting || (requirements.needsSupplier && !supplierId)}>
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
