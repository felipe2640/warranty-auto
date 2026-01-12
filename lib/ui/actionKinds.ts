import { AlertTriangle, Calendar } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type ActionKind = "TODAY" | "OVERDUE" | "NEXT_7_DAYS"

export const ACTION_KIND_META: Record<
  ActionKind,
  {
    label: string
    tabLabel: string
    icon: LucideIcon
    iconClass: string
    badgeClass: string
    dotClass: string
  }
> = {
  TODAY: {
    label: "Ações de Hoje",
    tabLabel: "Hoje",
    icon: Calendar,
    iconClass: "text-blue-600",
    badgeClass: "bg-blue-100 text-blue-800",
    dotClass: "bg-blue-500",
  },
  OVERDUE: {
    label: "Atrasadas",
    tabLabel: "Atrasadas",
    icon: AlertTriangle,
    iconClass: "text-destructive",
    badgeClass: "bg-red-100 text-red-800",
    dotClass: "bg-red-500",
  },
  NEXT_7_DAYS: {
    label: "Próximos 7 dias",
    tabLabel: "7 Dias",
    icon: Calendar,
    iconClass: "text-blue-600",
    badgeClass: "bg-blue-100 text-blue-800",
    dotClass: "bg-blue-500",
  },
}
