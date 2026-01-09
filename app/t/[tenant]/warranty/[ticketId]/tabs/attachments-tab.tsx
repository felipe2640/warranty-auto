"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Attachment, AttachmentCategory } from "@/lib/schemas"
import { AttachmentCategoryEnum } from "@/lib/schemas"
import { Plus, Eye, Download, FileText, Image } from "lucide-react"

interface TicketAttachmentsTabProps {
  attachments: Attachment[]
  canUpload: boolean
  onUpload: () => void
}

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  FOTO_PECA: "Fotos da Peça",
  CUPOM_FISCAL: "Cupons Fiscais",
  CERTIFICADO_GARANTIA: "Certificados de Garantia",
  NOTA_GARANTIA: "Notas de Garantia",
  CANHOTO: "Canhotos",
  OUTRO: "Outros",
  ASSINATURA: "Assinaturas",
}

export function TicketAttachmentsTab({ attachments, canUpload, onUpload }: TicketAttachmentsTabProps) {
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)

  const groupedAttachments = AttachmentCategoryEnum.options.reduce(
    (acc, category) => {
      const categoryAttachments = attachments.filter((a) => a.category === category)
      if (categoryAttachments.length > 0) {
        acc[category] = categoryAttachments
      }
      return acc
    },
    {} as Record<AttachmentCategory, Attachment[]>,
  )

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    })
  }

  const isImage = (mimeType: string) => mimeType.startsWith("image/")

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{attachments.length} anexo(s)</span>
        {canUpload && (
          <Button size="sm" onClick={onUpload}>
            <Plus className="h-4 w-4 mr-1" />
            Anexar
          </Button>
        )}
      </div>

      {/* Grouped attachments */}
      {Object.keys(groupedAttachments).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum anexo</div>
      ) : (
        <Accordion type="multiple" defaultValue={Object.keys(groupedAttachments)} className="space-y-2">
          {Object.entries(groupedAttachments).map(([category, categoryAttachments]) => (
            <AccordionItem key={category} value={category} className="border border-border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{CATEGORY_LABELS[category as AttachmentCategory]}</span>
                  <span className="text-xs text-muted-foreground">({categoryAttachments.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="space-y-2">
                  {categoryAttachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg text-sm">
                      {isImage(attachment.mimeType) ? (
                        <Image className="h-5 w-5 text-muted-foreground shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-foreground">{attachment.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)} • {formatDate(attachment.uploadedAt)}
                        </p>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewAttachment(attachment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <a href={`/api/files/${attachment.driveFileId}`} download={attachment.name}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previewAttachment?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewAttachment && isImage(previewAttachment.mimeType) ? (
              <img
                src={`/api/files/${previewAttachment.driveFileId}`}
                alt={previewAttachment.name}
                className="max-w-full max-h-[60vh] mx-auto rounded-lg"
                loading="lazy"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <FileText className="h-16 w-16 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Pré-visualização não disponível</p>
                <a href={`/api/files/${previewAttachment?.driveFileId}`} download={previewAttachment?.name}>
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
