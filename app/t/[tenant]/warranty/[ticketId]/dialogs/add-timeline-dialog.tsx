"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TimelineFormSchema, type TimelineFormData, TimelineTypeEnum } from "@/lib/schemas"
import { Loader2, AlertCircle } from "lucide-react"

interface AddTimelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  canSetNextAction: boolean
  onSuccess: () => void
}

const TYPE_LABELS = {
  OBS: "Observação",
  LIGACAO: "Ligação",
  EMAIL: "Email",
  PRAZO: "Prazo",
  STATUS_CHANGE: "Mudança de Status",
  DOCUMENTO: "Documento",
}

export function AddTimelineDialog({
  open,
  onOpenChange,
  ticketId,
  canSetNextAction,
  onSuccess,
}: AddTimelineDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TimelineFormData>({
    resolver: zodResolver(TimelineFormSchema),
    defaultValues: {
      type: "OBS",
      text: "",
      setNextAction: false,
    },
  })

  const watchSetNextAction = watch("setNextAction")
  const watchType = watch("type")

  const onSubmit = async (data: TimelineFormData) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Erro ao adicionar registro")
        return
      }

      onSuccess()
      handleClose()
    } catch {
      setError("Erro ao adicionar registro")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Registro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={watchType} onValueChange={(value) => setValue("type", value as typeof watchType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TimelineTypeEnum.options
                  .filter((t) => t !== "STATUS_CHANGE")
                  .map((type) => (
                    <SelectItem key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Texto *</Label>
            <Textarea {...register("text")} placeholder="Descreva o registro..." rows={3} />
            {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
          </div>

          {canSetNextAction && (
            <>
              <div className="flex items-center gap-3">
                <Switch
                  id="setNextAction"
                  checked={watchSetNextAction}
                  onCheckedChange={(checked) => setValue("setNextAction", checked)}
                />
                <Label htmlFor="setNextAction">Definir próxima ação</Label>
              </div>

              {watchSetNextAction && (
                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>Data da próxima ação *</Label>
                    <Input type="date" {...register("nextActionAt")} />
                  </div>

                  <div className="space-y-2">
                    <Label>Nota</Label>
                    <Input {...register("nextActionNote")} placeholder="Ex: Ligar para cobrar resposta" />
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
