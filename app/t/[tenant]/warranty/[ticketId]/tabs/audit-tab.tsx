"use client"

import { Badge } from "@/components/ui/badge"
import type { AuditEntry } from "@/lib/schemas"
import { ArrowRight, RotateCcw, Upload } from "lucide-react"

interface TicketAuditTabProps {
  audit: AuditEntry[]
}

export function TicketAuditTab({ audit }: TicketAuditTabProps) {
  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "STATUS_CHANGE":
        return <ArrowRight className="h-4 w-4" />
      case "ADMIN_REVERT":
        return <RotateCcw className="h-4 w-4" />
      case "UPLOAD":
        return <Upload className="h-4 w-4" />
      default:
        return null
    }
  }

  const getActionLabel = (entry: AuditEntry) => {
    switch (entry.action) {
      case "STATUS_CHANGE":
        return `${entry.fromStatus} → ${entry.toStatus}`
      case "ADMIN_REVERT":
        return `Revertido: ${entry.fromStatus} → ${entry.toStatus}`
      case "UPLOAD":
        return `Upload: ${(entry.metadata as { fileName?: string })?.fileName || "arquivo"}`
      default:
        return entry.action
    }
  }

  if (audit.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">Nenhum registro de auditoria</div>
  }

  return (
    <div className="space-y-3">
      {audit.map((entry) => (
        <div key={entry.id} className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {getActionIcon(entry.action)}
                <span>{entry.action}</span>
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(entry.createdAt)}</span>
          </div>

          <p className="text-sm font-medium text-foreground">{getActionLabel(entry)}</p>

          {entry.reason && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Motivo:</span> {entry.reason}
            </p>
          )}

          <p className="text-xs text-muted-foreground">por {entry.userName}</p>
        </div>
      ))}
    </div>
  )
}
