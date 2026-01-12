"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AppLayout } from "@/components/app-layout"
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Phone, Building2, Loader2, CheckCircle, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import type { Ticket, Supplier, Role, Store } from "@/lib/schemas"
import { ACTION_KIND_META, type ActionKind } from "@/lib/ui/actionKinds"
import { formatCpfCnpj, formatPhoneBR, onlyDigits } from "@/lib/format"
import { addDaysDateOnly, diffDaysDateOnly, formatDateOnly, toDateOnlyString, todayDateOnly } from "@/lib/date"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface GroupedTickets {
  today: (Ticket & { storeName: string; supplierName: string })[]
  overdue: (Ticket & { storeName: string; supplierName: string })[]
  next7Days: (Ticket & { storeName: string; supplierName: string })[]
}

interface AgendaClientProps {
  grouped: GroupedTickets
  suppliers: Supplier[]
  stores: Store[]
  tenant: string
  tenantName?: string
  userName: string
  userRole: Role
  canPerformActions: boolean
  initialTab: string
  nextCursors: {
    hoje?: string
    atrasadas?: string
    proximos?: string
  }
}

interface ContactDialogState {
  open: boolean
  ticket: (Ticket & { storeName: string; supplierName: string }) | null
}

type AgendaDayCounts = {
  TODAY: number
  OVERDUE: number
  NEXT_7_DAYS: number
  total: number
}

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const ACTION_KIND_ORDER: ActionKind[] = ["TODAY", "OVERDUE", "NEXT_7_DAYS"]

function startOfDay(date: Date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map((item) => Number.parseInt(item, 10))
  return new Date(year, month - 1, day)
}

function buildMonthGrid(reference: Date) {
  const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1)
  const monthEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 0)

  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())
  gridStart.setHours(0, 0, 0, 0)

  const gridEnd = new Date(monthEnd)
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()))
  gridEnd.setHours(0, 0, 0, 0)

  const days: Date[] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return { days, monthStart, monthEnd }
}

function getActionKindForDate(date: Date, today: Date): ActionKind | "OTHER" {
  const day = startOfDay(date)
  const todayStart = startOfDay(today)
  if (day.getTime() === todayStart.getTime()) return "TODAY"
  if (day < todayStart) return "OVERDUE"

  const tomorrow = new Date(todayStart)
  tomorrow.setDate(todayStart.getDate() + 1)
  const next7 = new Date(todayStart)
  next7.setDate(todayStart.getDate() + 7)

  if (day >= tomorrow && day <= next7) return "NEXT_7_DAYS"
  return "OTHER"
}

function formatClientContact(cpfCnpj: string, phone: string) {
  return [formatCpfCnpj(cpfCnpj), formatPhoneBR(phone)].filter(Boolean).join(" • ")
}

export function AgendaClient({
  grouped,
  suppliers,
  stores,
  tenant,
  tenantName,
  userName,
  userRole,
  canPerformActions,
  initialTab,
  nextCursors,
}: AgendaClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()

  const [activeTab, setActiveTab] = useState(initialTab)
  const [contactDialog, setContactDialog] = useState<ContactDialogState>({ open: false, ticket: null })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contactType, setContactType] = useState<"LIGACAO" | "EMAIL">("LIGACAO")
  const [contactNotes, setContactNotes] = useState("")
  const [nextActionDate, setNextActionDate] = useState("")
  const [nextActionNote, setNextActionNote] = useState("")

  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [calendarDays, setCalendarDays] = useState<Record<string, AgendaDayCounts>>({})
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarTruncated, setCalendarTruncated] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDayTickets, setSelectedDayTickets] = useState<(Ticket & { storeName: string; supplierName: string })[]>([])
  const [selectedDayCursor, setSelectedDayCursor] = useState<string | undefined>(undefined)
  const [selectedDayLoading, setSelectedDayLoading] = useState(false)
  const [selectedDayFilter, setSelectedDayFilter] = useState<"ALL" | ActionKind>("ALL")

  const TodayIcon = ACTION_KIND_META.TODAY.icon
  const OverdueIcon = ACTION_KIND_META.OVERDUE.icon
  const Next7Icon = ACTION_KIND_META.NEXT_7_DAYS.icon

  const storeMap = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores])
  const supplierMap = useMemo(() => new Map(suppliers.map((supplier) => [supplier.id, supplier])), [suppliers])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    params.delete("cursor")
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const handleNextPage = (tab: string, cursor?: string) => {
    if (!cursor) return
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    params.set("cursor", cursor)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const getSupplierPhone = useCallback((supplierId?: string) => {
    if (!supplierId) return null
    return supplierMap.get(supplierId)?.phone || null
  }, [supplierMap])

  const getStoreName = useCallback((storeId?: string) => {
    if (!storeId) return "—"
    return storeMap.get(storeId)?.name || "—"
  }, [storeMap])

  const getSupplierName = useCallback((supplierId?: string) => {
    if (!supplierId) return "—"
    return supplierMap.get(supplierId)?.name || "—"
  }, [supplierMap])

  const getDaysOverdue = (date?: string) => {
    if (!date) return 0
    const diff = diffDaysDateOnly(date, todayDateOnly())
    return Math.max(0, diff)
  }

  const formatShortDate = (date?: string) => {
    if (!date) return "—"
    const dateOnly = toDateOnlyString(date)
    if (!dateOnly) return "—"
    const [, month, day] = dateOnly.split("-")
    return `${day}/${month}`
  }

  const handleContactClick = (ticket: Ticket & { storeName: string; supplierName: string }) => {
    setContactDialog({ open: true, ticket })
    setContactType("LIGACAO")
    setContactNotes("")
    setNextActionDate(addDaysDateOnly(todayDateOnly(), 3))
    setNextActionNote("")
  }

  const handleContactSubmit = async () => {
    if (!contactDialog.ticket) return

    setIsSubmitting(true)
    try {
      // Add timeline entry
      await fetch(`/api/tickets/${contactDialog.ticket.id}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: contactType,
          text: contactNotes || `Contato realizado via ${contactType === "LIGACAO" ? "ligação" : "email"}`,
          setNextAction: true,
          nextActionAt: nextActionDate,
          nextActionNote: nextActionNote,
        }),
      })

      setContactDialog({ open: false, ticket: null })
      router.refresh()
    } catch (error) {
      console.error("[v0] Error logging contact:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderTicketCard = (ticket: Ticket & { storeName: string; supplierName: string }, showOverdue = false) => {
    const daysOver = showOverdue ? getDaysOverdue(ticket.nextActionAt || ticket.dueDate) : 0
    const phone = getSupplierPhone(ticket.supplierId)

    return (
      <Card key={ticket.id} className="hover:bg-muted/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Link
                  href={`/t/${tenant}/warranty/${ticket.id}`}
                  className="font-mono text-sm font-medium hover:underline"
                >
                  #{ticket.id.substring(0, 6).toUpperCase()}
                </Link>
                <StatusBadge status={ticket.status} size="sm" />
                {showOverdue && daysOver > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {daysOver}d atraso
                  </Badge>
                )}
              </div>
              <p className="font-medium text-sm">{ticket.nomeRazaoSocial}</p>
              <p className="text-sm text-muted-foreground">{formatClientContact(ticket.cpfCnpj, ticket.celular)}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {ticket.supplierName}
                </span>
                {ticket.nextActionAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Ação: {formatShortDate(ticket.nextActionAt)}
                  </span>
                )}
                {ticket.nextActionNote && (
                  <span className="text-xs italic truncate max-w-[200px]">{ticket.nextActionNote}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {canPerformActions && (
                <Button size="sm" onClick={() => handleContactClick(ticket)}>
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Contato
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link href={`/t/${tenant}/warranty/${ticket.id}`}>
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Abrir
                </Link>
              </Button>
              {phone && (
                <a
                  href={`tel:${onlyDigits(phone)}`}
                  className="text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {formatPhoneBR(phone)}
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderTable = (tickets: (Ticket & { storeName: string; supplierName: string })[], showOverdue = false) => {
    if (tickets.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma garantia nesta categoria</p>
        </div>
      )
    }

    return (
      <>
        {/* Desktop Table */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Próxima Ação</TableHead>
                {showOverdue && <TableHead>Atraso</TableHead>}
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const daysOver = showOverdue ? getDaysOverdue(ticket.nextActionAt || ticket.dueDate) : 0
                return (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Link
                        href={`/t/${tenant}/warranty/${ticket.id}`}
                        className="font-mono text-sm font-medium hover:underline"
                      >
                        #{ticket.id.substring(0, 6).toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{ticket.nomeRazaoSocial}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatClientContact(ticket.cpfCnpj, ticket.celular)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{ticket.supplierName}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{formatShortDate(ticket.nextActionAt)}</p>
                        {ticket.nextActionNote && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {ticket.nextActionNote}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    {showOverdue && (
                      <TableCell>
                        {daysOver > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {daysOver}d
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canPerformActions && (
                          <Button size="sm" variant="outline" onClick={() => handleContactClick(ticket)}>
                            <Phone className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" asChild>
                          <Link href={`/t/${tenant}/warranty/${ticket.id}`}>Abrir</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">{tickets.map((ticket) => renderTicketCard(ticket, showOverdue))}</div>
      </>
    )
  }

  const totalCount = grouped.today.length + grouped.overdue.length + grouped.next7Days.length

  const calendarGrid = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth])
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  useEffect(() => {
    if (!calendarOpen) return

    const month = calendarMonth.getMonth() + 1
    const year = calendarMonth.getFullYear()

    let active = true
    setCalendarLoading(true)
    fetch(`/api/agenda/calendar?month=${month}&year=${year}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || "Erro ao carregar calendário")
        return data
      })
      .then((data) => {
        if (!active) return
        setCalendarDays(data.days || {})
        setCalendarTruncated(Boolean(data.truncated))
      })
      .catch(() => {
        if (!active) return
        setCalendarDays({})
        setCalendarTruncated(false)
      })
      .finally(() => {
        if (!active) return
        setCalendarLoading(false)
      })

    return () => {
      active = false
    }
  }, [calendarOpen, calendarMonth])

  useEffect(() => {
    if (!calendarOpen) return
    if (!selectedDate) {
      setSelectedDate(toDateKey(new Date()))
    }
  }, [calendarOpen, selectedDate])

  useEffect(() => {
    if (!calendarOpen || !selectedDate) return

    let active = true
    setSelectedDayLoading(true)
    setSelectedDayFilter("ALL")

    fetch(`/api/agenda/day?date=${selectedDate}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || "Erro ao carregar ações do dia")
        return data
      })
      .then((data) => {
        if (!active) return
        const mapped = (data.tickets || []).map((ticket: Ticket) => ({
          ...ticket,
          storeName: getStoreName(ticket.storeId),
          supplierName: ticket.supplierId ? getSupplierName(ticket.supplierId) : "—",
        }))
        setSelectedDayTickets(mapped)
        setSelectedDayCursor(data.nextCursor)
      })
      .catch(() => {
        if (!active) return
        setSelectedDayTickets([])
        setSelectedDayCursor(undefined)
      })
      .finally(() => {
        if (!active) return
        setSelectedDayLoading(false)
      })

    return () => {
      active = false
    }
  }, [calendarOpen, selectedDate, getStoreName, getSupplierName])

  const loadMoreDayTickets = async () => {
    if (!selectedDate || !selectedDayCursor) return
    setSelectedDayLoading(true)

    try {
      const response = await fetch(`/api/agenda/day?date=${selectedDate}&cursor=${selectedDayCursor}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Erro ao carregar ações do dia")

      const mapped = (data.tickets || []).map((ticket: Ticket) => ({
        ...ticket,
        storeName: getStoreName(ticket.storeId),
        supplierName: ticket.supplierId ? getSupplierName(ticket.supplierId) : "—",
      }))

      setSelectedDayTickets((prev) => [...prev, ...mapped])
      setSelectedDayCursor(data.nextCursor)
    } catch (error) {
      console.error("Error loading day tickets:", error)
    } finally {
      setSelectedDayLoading(false)
    }
  }

  const selectedDateObj = selectedDate ? parseDateKey(selectedDate) : null
  const selectedDayKind = selectedDateObj ? getActionKindForDate(selectedDateObj, new Date()) : "OTHER"

  const filteredDayTickets = selectedDayFilter === "ALL"
    ? selectedDayTickets
    : selectedDayKind === selectedDayFilter
      ? selectedDayTickets
      : []

  const renderCalendarGrid = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm font-medium capitalize">
          {calendarMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {calendarTruncated && (
        <p className="text-xs text-amber-600">Resultados limitados para evitar sobrecarga do mês.</p>
      )}

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEK_DAYS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarGrid.days.map((date) => {
          const key = toDateKey(date)
          const counts = calendarDays[key]
          const hasKindCounts = Boolean(counts && (counts.TODAY || counts.OVERDUE || counts.NEXT_7_DAYS))
          const hasNeutral = Boolean(counts && counts.total > 0 && !hasKindCounts)
          const isCurrentMonth = date.getMonth() === calendarMonth.getMonth()
          const isSelected = key === selectedDate
          const isToday = key === todayKey

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              className={cn(
                "flex min-h-[84px] flex-col gap-1 rounded-md border border-transparent p-2 text-left text-xs transition-colors",
                isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground",
                isSelected ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30",
                isToday && "border-primary",
              )}
            >
              <span className={cn("text-xs font-medium", !isCurrentMonth && "text-muted-foreground")}>
                {date.getDate()}
              </span>

              {calendarLoading ? (
                <span className="text-[10px] text-muted-foreground">...</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {ACTION_KIND_ORDER.map((kind) => {
                    const count = counts?.[kind] || 0
                    if (!count) return null
                    const meta = ACTION_KIND_META[kind]
                    const Icon = meta.icon
                    return (
                      <span
                        key={kind}
                        className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]", meta.badgeClass)}
                      >
                        <Icon className="h-3 w-3" />
                        {count}
                      </span>
                    )
                  })}
                  {hasNeutral && <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium">Ações em {selectedDate ? formatDateOnly(selectedDate) : "—"}</p>
              <p className="text-xs text-muted-foreground">{selectedDayTickets.length} garantia(s)</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedDayFilter === "ALL" ? "default" : "outline"}
                onClick={() => setSelectedDayFilter("ALL")}
              >
                Todas
              </Button>
              {ACTION_KIND_ORDER.map((kind) => {
                const meta = ACTION_KIND_META[kind]
                const Icon = meta.icon
                return (
                  <Button
                    key={kind}
                    size="sm"
                    variant={selectedDayFilter === kind ? "default" : "outline"}
                    onClick={() => setSelectedDayFilter(kind)}
                  >
                    <Icon className="mr-1 h-3 w-3" />
                    {meta.tabLabel}
                  </Button>
                )
              })}
            </div>
          </div>

          {selectedDayLoading ? (
            <p className="text-sm text-muted-foreground">Carregando ações...</p>
          ) : filteredDayTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ação encontrada para este filtro.</p>
          ) : (
            <div className="space-y-2">
              {filteredDayTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium">#{ticket.id.substring(0, 6).toUpperCase()}</span>
                      <StatusBadge status={ticket.status} size="sm" />
                    </div>
                    <p className="text-sm font-medium truncate">{ticket.nomeRazaoSocial}</p>
                    <p className="text-xs text-muted-foreground">{formatClientContact(ticket.cpfCnpj, ticket.celular)}</p>
                    <p className="text-xs text-muted-foreground">{ticket.storeName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {ticket.nextActionAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(ticket.nextActionAt)}
                      </span>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/t/${tenant}/warranty/${ticket.id}`}>Abrir</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedDayCursor && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={loadMoreDayTickets} disabled={selectedDayLoading}>
                {selectedDayLoading ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <AppLayout
      tenant={tenant}
      tenantName={tenantName}
      userName={userName}
      userRole={userRole}
      breadcrumbs={[{ label: "Agenda", href: `/t/${tenant}/agenda` }]}
      title="Agenda"
    >
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">{totalCount} garantias com ações pendentes</p>
            <Button variant="outline" onClick={() => setCalendarOpen(true)}>
              <Calendar className="mr-2 h-4 w-4" />
              Calendário
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 grid w-full grid-cols-3">
              <TabsTrigger value="hoje" className="gap-2">
                <TodayIcon className={`h-4 w-4 ${ACTION_KIND_META.TODAY.iconClass}`} />
                <span>{ACTION_KIND_META.TODAY.tabLabel}</span>
                {grouped.today.length > 0 && (
                  <Badge className={cn("ml-1", ACTION_KIND_META.TODAY.badgeClass)}>
                    {grouped.today.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="atrasadas" className="gap-2">
                <OverdueIcon className={`h-4 w-4 ${ACTION_KIND_META.OVERDUE.iconClass}`} />
                <span>{ACTION_KIND_META.OVERDUE.tabLabel}</span>
                {grouped.overdue.length > 0 && (
                  <Badge className={cn("ml-1", ACTION_KIND_META.OVERDUE.badgeClass)}>
                    {grouped.overdue.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="proximos" className="gap-2">
                <Next7Icon className={`h-4 w-4 ${ACTION_KIND_META.NEXT_7_DAYS.iconClass}`} />
                <span>{ACTION_KIND_META.NEXT_7_DAYS.tabLabel}</span>
                {grouped.next7Days.length > 0 && (
                  <Badge className={cn("ml-1", ACTION_KIND_META.NEXT_7_DAYS.badgeClass)}>
                    {grouped.next7Days.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="hoje" className="space-y-4">
              {renderTable(grouped.today, false)}
              {nextCursors.hoje && (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => handleNextPage("hoje", nextCursors.hoje)}>
                    Próxima página
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="atrasadas" className="space-y-4">
              {renderTable(grouped.overdue, true)}
              {nextCursors.atrasadas && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNextPage("atrasadas", nextCursors.atrasadas)}
                  >
                    Próxima página
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="proximos" className="space-y-4">
              {renderTable(grouped.next7Days, false)}
              {nextCursors.proximos && (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => handleNextPage("proximos", nextCursors.proximos)}>
                    Próxima página
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {isMobile ? (
        <Sheet open={calendarOpen} onOpenChange={setCalendarOpen}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Calendário</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{renderCalendarGrid()}</div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Calendário</DialogTitle>
              <DialogDescription>Resumo mensal das ações pendentes.</DialogDescription>
            </DialogHeader>
            {renderCalendarGrid()}
          </DialogContent>
        </Dialog>
      )}

      {/* Contact Dialog */}
      <Dialog open={contactDialog.open} onOpenChange={(open) => setContactDialog({ open, ticket: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Contato Feito</DialogTitle>
            <DialogDescription>Registre o contato realizado e defina a próxima ação.</DialogDescription>
          </DialogHeader>

          {contactDialog.ticket && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-mono text-sm font-medium">
                  #{contactDialog.ticket.id.substring(0, 6).toUpperCase()}
                </p>
                <p className="text-sm">{contactDialog.ticket.nomeRazaoSocial}</p>
                <p className="text-xs text-muted-foreground">{contactDialog.ticket.supplierName}</p>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Contato</Label>
                <Select value={contactType} onValueChange={(v) => setContactType(v as "LIGACAO" | "EMAIL")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIGACAO">Ligação</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notas do Contato</Label>
                <Textarea
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  placeholder="Resultado do contato, informações obtidas..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Próxima Ação (Data)</Label>
                  <Input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Nota da Próxima Ação</Label>
                  <Input
                    value={nextActionNote}
                    onChange={(e) => setNextActionNote(e.target.value)}
                    placeholder="Ex: Retornar ligação"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setContactDialog({ open: false, ticket: null })}>
              Cancelar
            </Button>
            <Button onClick={handleContactSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Contato"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
