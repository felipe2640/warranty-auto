"use client"

import { useState } from "react"
import { Check, Circle, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Status } from "@/lib/schemas"
import { STATUS_ORDER } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface StageInfo {
  status: Status
  completedAt?: Date
  completedBy?: string
  completedByName?: string
}

interface StepperProps {
  currentStatus: Status
  stageHistory?: StageInfo[]
  stageSummaryMap?: Record<Status, { status: Status; at?: Date; byName?: string; lastNote?: string; attachmentsPreview: Array<{ name: string; driveFileId: string }> }>
  onStageClick?: (status: Status) => void
}

const STATUS_LABELS: Record<Status, string> = {
  RECEBIMENTO: "Recebimento",
  INTERNO: "Interno",
  ENTREGA_LOGISTICA: "Logística",
  COBRANCA_ACOMPANHAMENTO: "Cobrança",
  RESOLUCAO: "Resolução",
  ENCERRADO: "Encerrado",
}

export function Stepper({ currentStatus, stageHistory = [], stageSummaryMap, onStageClick }: StepperProps) {
  const [expandedStep, setExpandedStep] = useState<Status | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null)
  const currentIndex = STATUS_ORDER.indexOf(currentStatus)

  const getStageInfo = (status: Status): StageInfo | undefined => {
    return stageHistory.find((s) => s.status === status)
  }

  const getStepState = (status: Status, index: number) => {
    if (index < currentIndex) return "completed"
    if (index === currentIndex) return "current"
    return "upcoming"
  }

  const formatDate = (date?: Date) => {
    if (!date) return ""
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getInitials = (name?: string) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div className="w-full">
      {/* Desktop: Horizontal Stepper */}
      <div className="hidden md:flex items-center justify-between">
        {STATUS_ORDER.map((status, index) => {
          const state = getStepState(status, index)
          const stageInfo = getStageInfo(status)

          return (
            <div key={status} className="flex items-center flex-1">
              <button
                onClick={() => {
                  if (state !== "completed") return
                  setSelectedStatus(status)
                  onStageClick?.(status)
                }}
                disabled={state !== "completed"}
                className={cn("flex flex-col items-center gap-2 group", state === "completed" && "cursor-pointer")}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                    state === "completed" && "bg-primary border-primary text-primary-foreground",
                    state === "current" && "border-primary bg-primary/10 text-primary",
                    state === "upcoming" && "border-muted bg-muted text-muted-foreground",
                  )}
                >
                  {state === "completed" ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                </div>
                <div className="text-center">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      state === "current" ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </p>
                  {stageInfo?.completedAt && (
                    <p className="text-[10px] text-muted-foreground">{formatDate(stageInfo.completedAt)}</p>
                  )}
                  {stageInfo?.completedByName && (
                    <div className="mt-1 w-6 h-6 mx-auto rounded-full bg-muted text-[10px] flex items-center justify-center text-muted-foreground">
                      {getInitials(stageInfo.completedByName)}
                    </div>
                  )}
                </div>
              </button>

              {index < STATUS_ORDER.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-2", index < currentIndex ? "bg-primary" : "bg-muted")} />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: Vertical Stepper */}
      <div className="md:hidden space-y-2">
        {STATUS_ORDER.map((status, index) => {
          const state = getStepState(status, index)
          const stageInfo = getStageInfo(status)
          const isExpanded = expandedStep === status

          return (
            <Collapsible
              key={status}
              open={isExpanded}
              onOpenChange={() => setExpandedStep(isExpanded ? null : status)}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2",
                      state === "completed" && "bg-primary border-primary text-primary-foreground",
                      state === "current" && "border-primary bg-primary/10 text-primary",
                      state === "upcoming" && "border-muted bg-muted text-muted-foreground",
                    )}
                  >
                    {state === "completed" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  {index < STATUS_ORDER.length - 1 && (
                    <div className={cn("w-0.5 h-8 mt-1", index < currentIndex ? "bg-primary" : "bg-muted")} />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <CollapsibleTrigger asChild disabled={state !== "completed"}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (state === "completed") {
                          setSelectedStatus(status)
                        }
                      }}
                      className={cn(
                        "w-full justify-between p-0 h-auto font-normal",
                        state !== "completed" && "pointer-events-none",
                      )}
                    >
                      <span
                        className={cn("text-sm font-medium", state === "current" ? "text-primary" : "text-foreground")}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                      {state === "completed" &&
                        (isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ))}
                    </Button>
                  </CollapsibleTrigger>

                  {stageInfo?.completedAt && state === "completed" && !isExpanded && (
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(stageInfo.completedAt)}</p>
                  )}

                  <CollapsibleContent>
                    {stageInfo && (
                      <div className="mt-2 p-3 bg-muted rounded-md text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">Data:</span> {formatDate(stageInfo.completedAt)}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Por:</span> {stageInfo.completedByName || "—"}
                        </p>
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </div>
            </Collapsible>
          )
        })}
      </div>

      <Dialog open={!!selectedStatus} onOpenChange={() => setSelectedStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumo da etapa</DialogTitle>
          </DialogHeader>
          {selectedStatus && stageSummaryMap?.[selectedStatus] ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Etapa:</span> {STATUS_LABELS[selectedStatus]}
              </p>
              <p>
                <span className="text-muted-foreground">Data/Hora:</span>{" "}
                {formatDate(stageSummaryMap[selectedStatus].at)}
              </p>
              <p>
                <span className="text-muted-foreground">Responsável:</span>{" "}
                {stageSummaryMap[selectedStatus].byName || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Última nota:</span>{" "}
                {stageSummaryMap[selectedStatus].lastNote || "—"}
              </p>
              <div>
                <p className="text-muted-foreground">Anexos:</p>
                {stageSummaryMap[selectedStatus].attachmentsPreview.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum anexo</p>
                ) : (
                  <ul className="space-y-1">
                    {stageSummaryMap[selectedStatus].attachmentsPreview.map((attachment, index) => (
                      <li key={`${attachment.driveFileId}-${index}`}>
                        <a
                          href={`/api/files/${attachment.driveFileId}`}
                          className="text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {attachment.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Resumo indisponível.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
