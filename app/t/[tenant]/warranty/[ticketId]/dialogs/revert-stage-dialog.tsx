"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Ticket, Status } from "@/lib/schemas"
import { STATUS_ORDER } from "@/lib/schemas"
import { Loader2, AlertCircle } from "lucide-react"

interface RevertStageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket
  onSuccess: () => void
}

const STATUS_LABELS: Record<Status, string> = {
  RECEBIMENTO: "Recebimento",
  INTERNO: "Interno",
  ENTREGA_LOGISTICA: "Logística",
  COBRANCA_ACOMPANHAMENTO: "Cobrança",
  RESOLUCAO: "Resolução",
  ENCERRADO: "Encerrado",
}

export function RevertStageDialog({ open, onOpenChange, ticket, onSuccess }: RevertStageDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targetStatus, setTargetStatus] = useState<string>("")
  const [reason, setReason] = useState<string>("")

  const currentIndex = STATUS_ORDER.indexOf(ticket.status)
  const availableStatuses = STATUS_ORDER.slice(0, currentIndex)

  const handleRevert = async () => {
    if (!targetStatus || !reason.trim()) {
      setError("Status e motivo são obrigatórios")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revert",
          targetStatus,
          reason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao reverter etapa")
        return
      }

      onSuccess()
      onOpenChange(false)
    } catch {
      setError("Erro ao reverter etapa")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetState = () => {
    setError(null)
    setTargetStatus("")
    setReason("")
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
          <DialogTitle>Voltar Etapa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Status atual</Label>
            <p className="text-sm font-medium text-foreground">{STATUS_LABELS[ticket.status]}</p>
          </div>

          <div className="space-y-2">
            <Label>Voltar para *</Label>
            <Select value={targetStatus} onValueChange={setTargetStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Informe o motivo da reversão..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleRevert}
            disabled={isSubmitting || !targetStatus || !reason.trim()}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revertendo...
              </>
            ) : (
              "Reverter"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
