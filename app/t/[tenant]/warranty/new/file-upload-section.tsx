"use client"

import type React from "react"

import { memo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Upload, X, Eye, FileText, Download } from "lucide-react"
import { AttachmentCategoryEnum } from "@/lib/schemas"

interface FileWithCategory {
  file: File
  category: string
}

interface FileUploadSectionProps {
  files: FileWithCategory[]
  onFilesChange: (files: FileWithCategory[]) => void
  disabled?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  FOTO_PECA: "Foto da Peça",
  CUPOM_FISCAL: "Cupom Fiscal",
  CERTIFICADO_GARANTIA: "Certificado de Garantia",
  NOTA_GARANTIA: "Nota de Garantia",
  CANHOTO: "Canhoto",
  OUTRO: "Outro",
}

function FileUploadSectionComponent({ files, onFilesChange, disabled }: FileUploadSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    const newFiles: FileWithCategory[] = Array.from(selectedFiles).map((file) => ({
      file,
      category: "", // Category must be selected
    }))

    onFilesChange([...files, ...newFiles])

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const handleCategoryChange = (index: number, category: string) => {
    const updated = [...files]
    updated[index].category = category
    onFilesChange(updated)
  }

  const handleRemove = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    onFilesChange(updated)
  }

  const handlePreview = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreviewFile({ url, name: file.name, type: file.type })
  }

  const closePreview = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url)
    }
    setPreviewFile(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const categories = AttachmentCategoryEnum.options.filter((c) => c !== "ASSINATURA")

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full border-dashed"
      >
        <Upload className="h-4 w-4 mr-2" />
        Selecionar Arquivos
      </Button>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item, index) => (
            <div key={index} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-muted/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.file.type.split("/")[1]?.toUpperCase()} • {formatFileSize(item.file.size)}
                </p>
              </div>

              <Select value={item.category} onValueChange={(value) => handleCategoryChange(index, value)}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePreview(item.file)}
              >
                <Eye className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {files.some((f) => !f.category) && (
            <p className="text-xs text-amber-600">Selecione uma categoria para todos os arquivos antes de enviar.</p>
          )}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={closePreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewFile?.type.startsWith("image/") ? (
              <img
                src={previewFile.url || "/image.png"}
                alt={previewFile.name}
                className="max-w-full max-h-[60vh] mx-auto rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Pré-visualização não disponível para PDF</p>
                <a href={previewFile?.url} download={previewFile?.name}>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar arquivo
                  </Button>
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const FileUploadSection = memo(FileUploadSectionComponent)
