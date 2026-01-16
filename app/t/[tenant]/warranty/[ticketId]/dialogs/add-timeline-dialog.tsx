"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
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
import {
  AttachmentCategoryEnum,
  TimelineFormSchema,
  type TimelineFormData,
  TimelineNextActionRequiredTypes,
  TimelineTypeEnum,
} from "@/lib/schemas"
import { compressImageFile } from "@/lib/client/imageCompression"
import { Loader2, AlertCircle, Upload, X } from "lucide-react"

interface AddTimelineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  canSetNextAction: boolean
  canAttachCanhoto: boolean
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

const CATEGORY_LABELS: Record<string, string> = {
  FOTO_PECA: "Foto da Peça",
  CUPOM_FISCAL: "Cupom Fiscal",
  CERTIFICADO_GARANTIA: "Certificado de Garantia",
  NOTA_GARANTIA: "Nota de Garantia",
  CANHOTO: "Canhoto",
  OUTRO: "Outro",
}

export function AddTimelineDialog({
  open,
  onOpenChange,
  ticketId,
  canSetNextAction,
  canAttachCanhoto,
  onSuccess,
}: AddTimelineDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>("")

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
  const isDocumentType = watchType === "DOCUMENTO"
  const requiresNextAction = TimelineNextActionRequiredTypes.includes(
    watchType as (typeof TimelineNextActionRequiredTypes)[number],
  )

  useEffect(() => {
    if (requiresNextAction) {
      setValue("setNextAction", true, { shouldValidate: true })
    }
  }, [requiresNextAction, setValue])

  useEffect(() => {
    if (isDocumentType) {
      setValue("setNextAction", false, { shouldValidate: true })
      const textValue = file ? `Documento anexado: ${file.name}` : "Documento anexado"
      setValue("text", textValue, { shouldValidate: true })
    }
  }, [isDocumentType, file, setValue])

  useEffect(() => {
    if (!isDocumentType) {
      setFile(null)
      setCategory("")
      if (inputRef.current) inputRef.current.value = ""
      return
    }
  }, [isDocumentType])

  const availableTypes = TimelineTypeEnum.options.filter((type) => {
    if (type === "STATUS_CHANGE") return false
    if (!canSetNextAction && TimelineNextActionRequiredTypes.includes(type as (typeof TimelineNextActionRequiredTypes)[number])) {
      return false
    }
    return true
  })

  const categories = AttachmentCategoryEnum.options.filter((c) => {
    if (c === "ASSINATURA") return false
    if (c === "CANHOTO" && !canAttachCanhoto) return false
    return true
  })

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    setError(null)
  }

  const onSubmit = async (data: TimelineFormData) => {
    setError(null)
    setIsSubmitting(true)

    try {
      if (data.type === "DOCUMENTO") {
        if (!file || !category) {
          setError("Arquivo e categoria são obrigatórios")
          return
        }

        let uploadFile = file
        if (file.type.startsWith("image/")) {
          setIsOptimizing(true)
          try {
            uploadFile = await compressImageFile(file)
          } finally {
            setIsOptimizing(false)
          }
        }

        const formData = new FormData()
        formData.append("file", uploadFile)
        formData.append("category", category)
        formData.append("text", data.text)

        const response = await fetch(`/api/tickets/${ticketId}/timeline/attachment`, {
          method: "POST",
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          const message = result?.error?.message || result?.error || "Erro ao anexar documento"
          const code = result?.error?.code ? ` (${result.error.code})` : ""
          setError(`${message}${code}`)
          return
        }

        onSuccess()
        handleClose()
        return
      }

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
    setFile(null)
    setCategory("")
    setError(null)
    setIsOptimizing(false)
    if (inputRef.current) inputRef.current.value = ""
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
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isDocumentType ? (
            <div className="space-y-4">
              {isOptimizing && <p className="text-xs text-muted-foreground">Otimizando imagem...</p>}

              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {!file ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => inputRef.current?.click()}
                  className="w-full h-24 border-dashed"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6" />
                    <span>Selecionar arquivo</span>
                  </div>
                </Button>
              ) : (
                <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.type.split("/")[1]?.toUpperCase()} • {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      setFile(null)
                      if (inputRef.current) inputRef.current.value = ""
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat] || cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Texto *</Label>
              <Textarea {...register("text")} placeholder="Descreva o registro..." rows={3} />
              {errors.text && <p className="text-sm text-destructive">{errors.text.message}</p>}
            </div>
          )}

          {canSetNextAction && !isDocumentType && (
            <>
              <div className="flex items-center gap-3">
                <Switch
                  id="setNextAction"
                  checked={watchSetNextAction}
                  onCheckedChange={(checked) => setValue("setNextAction", checked)}
                  disabled={requiresNextAction}
                />
                <Label htmlFor="setNextAction">Definir próxima ação</Label>
              </div>

              {(watchSetNextAction || requiresNextAction) && (
                <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>Data da próxima ação *</Label>
                    <Input type="date" {...register("nextActionAt")} />
                    {errors.nextActionAt && (
                      <p className="text-sm text-destructive">{errors.nextActionAt.message}</p>
                    )}
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
