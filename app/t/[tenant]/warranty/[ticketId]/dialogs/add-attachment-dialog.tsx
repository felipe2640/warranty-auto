"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AttachmentCategoryEnum } from "@/lib/schemas"
import { Loader2, AlertCircle, Upload, X } from "lucide-react"

interface AddAttachmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticketId: string
  canAttachCanhoto: boolean
  onSuccess: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  FOTO_PECA: "Foto da Peça",
  CUPOM_FISCAL: "Cupom Fiscal",
  CERTIFICADO_GARANTIA: "Certificado de Garantia",
  NOTA_GARANTIA: "Nota de Garantia",
  CANHOTO: "Canhoto",
  OUTRO: "Outro",
}

export function AddAttachmentDialog({ open, onOpenChange, ticketId, canAttachCanhoto, onSuccess }: AddAttachmentDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState<string>("")

  const categories = AttachmentCategoryEnum.options.filter((c) => {
    if (c === "ASSINATURA") return false
    if (c === "CANHOTO" && !canAttachCanhoto) return false
    return true
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = async () => {
    if (!file || !category) {
      setError("Arquivo e categoria são obrigatórios")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("category", category)

      const response = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || "Erro ao anexar arquivo")
        return
      }

      onSuccess()
      handleClose()
    } catch {
      setError("Erro ao anexar arquivo")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setCategory("")
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
    onOpenChange(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar Arquivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
                  {file.type.split("/")[1]?.toUpperCase()} • {formatFileSize(file.size)}
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
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !file || !category}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Anexar"
            )}
          </Button>
        </Dialog\
