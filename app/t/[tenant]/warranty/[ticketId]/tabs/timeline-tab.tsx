"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TimelineEntry, TimelineType } from "@/lib/schemas"
import { TimelineTypeEnum } from "@/lib/schemas"
import { Plus, Phone, Mail, FileText, Clock, ArrowRight, Calendar } from "lucide-react"
import { useState } from "react"

interface TicketTimelineTabProps {
  timeline: TimelineEntry[]
  canAddEntry: boolean
  onAddEntry: () => void
}

const TYPE_ICONS: Record<TimelineType, React.ReactNode> = {
  OBS: <FileText className="h-4 w-4" />,
  LIGACAO: <Phone className="h-4 w-4" />,
  EMAIL: <Mail className="h-4 w-4" />,
  PRAZO: <Clock className="h-4 w-4" />,
  STATUS_CHANGE: <ArrowRight className="h-4 w-4" />,
  DOCUMENTO: <FileText className="h-4 w-4" />,
}

const TYPE_LABELS: Record<TimelineType, string> = {
  OBS: "Observação",
  LIGACAO: "Ligação",
  EMAIL: "Email",
  PRAZO: "Prazo",
  STATUS_CHANGE: "Mudança de Status",
  DOCUMENTO: "Documento",
}

const TYPE_COLORS: Record<TimelineType, string> = {
  OBS: "bg-gray-100 text-gray-800",
  LIGACAO: "bg-green-100 text-green-800",
  EMAIL: "bg-blue-100 text-blue-800",
  PRAZO: "bg-amber-100 text-amber-800",
  STATUS_CHANGE: "bg-purple-100 text-purple-800",
  DOCUMENTO: "bg-cyan-100 text-cyan-800",
}

export function TicketTimelineTab({ timeline, canAddEntry, onAddEntry }: TicketTimelineTabProps) {
  const [filter, setFilter] = useState<string>("all")

  const filteredTimeline = filter === "all" ? timeline : timeline.filter((entry) => entry.type === filter)

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-4">
      {/* Header with filter and add button */}
      <div className="flex items-center justify-between gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TimelineTypeEnum.options.map((type) => (
              <SelectItem key={type} value={type}>
                {TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canAddEntry && (
          <Button size="sm" onClick={onAddEntry}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Timeline list */}
      {filteredTimeline.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</div>
      ) : (
        <div className="space-y-3">
          {filteredTimeline.map((entry) => (
            <div key={entry.id} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={TYPE_COLORS[entry.type]}>
                    {TYPE_ICONS[entry.type]}
                    <span className="ml-1">{TYPE_LABELS[entry.type]}</span>
                  </Badge>
                  {entry.nextActionAt && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      Ação marcada
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(entry.createdAt)}</span>
              </div>

              <p className="text-sm text-foreground">{entry.text}</p>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>por {entry.userName}</span>
                {entry.nextActionAt && <span>Próxima ação: {formatDateTime(entry.nextActionAt)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
