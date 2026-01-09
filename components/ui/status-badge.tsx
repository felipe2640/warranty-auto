import { Badge } from "@/components/ui/badge"
import type { Status } from "@/lib/schemas"
import { cn } from "@/lib/utils"

export const STATUS_CONFIG: Record<Status, { label: string; color: string; className: string }> = {
  RECEBIMENTO: {
    label: "Recebimento",
    color: "#3b82f6",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  INTERNO: {
    label: "Interno",
    color: "#eab308",
    className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  },
  ENTREGA_LOGISTICA: {
    label: "Logística",
    color: "#f97316",
    className: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  },
  COBRANCA_ACOMPANHAMENTO: {
    label: "Cobrança",
    color: "#a855f7",
    className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  },
  RESOLUCAO: {
    label: "Resolução",
    color: "#14b8a6",
    className: "bg-teal-100 text-teal-800 hover:bg-teal-100",
  },
  ENCERRADO: {
    label: "Encerrado",
    color: "#22c55e",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
}

interface StatusBadgeProps {
  status: Status
  className?: string
  size?: "sm" | "default"
}

export function StatusBadge({ status, className, size = "default" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <Badge variant="secondary" className={cn(config.className, size === "sm" && "text-[10px] px-1.5 py-0", className)}>
      {config.label}
    </Badge>
  )
}
