"use client"

import { useState } from "react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AppLayout } from "@/components/app-layout"
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar, Clock, AlertTriangle, Phone, Building2, Loader2, CheckCircle, ExternalLink } from "lucide-react"
import type { Ticket, Supplier, Role } from "@/lib/schemas"

interface GroupedTickets {
  today: (Ticket & { storeName: string; supplierName: string })[]
  overdue: (Ticket & { storeName: string; supplierName: string })[]
  next7Days: (Ticket & { storeName: string; supplierName: string })[]
}

interface AgendaClientProps {
  grouped: GroupedTickets
  suppliers: Supplier[]
  tenant: string
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

export function AgendaClient({
  grouped,
  suppliers,
  tenant,
  userName,
  userRole,
  canPerformActions,
  initialTab,
  nextCursors,
}: AgendaClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [contactDialog, setContactDialog] = useState<ContactDialogState>({ open: false, ticket: null })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contactType, setContactType] = useState<"LIGACAO" | "EMAIL">("LIGACAO")
  const [contactNotes, setContactNotes] = useState("")
  const [nextActionDate, setNextActionDate] = useState("")
  const [nextActionNote, setNextActionNote] = useState("")

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

  const getSupplierPhone = (supplierId?: string) => {
    if (!supplierId) return null
    return suppliers.find((s) => s.id === supplierId)?.phone
  }

  const getDaysOverdue = (date?: Date | string) => {
    if (!date) return 0
    const d = new Date(date)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }

  const handleContactClick = (ticket: Ticket & { storeName: string; supplierName: string }) => {
    setContactDialog({ open: true, ticket })
    setContactType("LIGACAO")
    setContactNotes("")
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 3)
    setNextActionDate(defaultDate.toISOString().split("T")[0])
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
              <p className="text-sm text-muted-foreground">{ticket.celular}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {ticket.supplierName}
                </span>
                {ticket.nextActionAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Ação: {formatDate(ticket.nextActionAt)}
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
                  href={`tel:${phone}`}
                  className="text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {phone}
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
                        <p className="text-xs text-muted-foreground">{ticket.celular}</p>
                      </div>
                    </TableCell>
                    <TableCell>{ticket.supplierName}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{formatDate(ticket.nextActionAt)}</p>
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

  return (
    <AppLayout
      tenant={tenant}
      userName={userName}
      userRole={userRole}
      breadcrumbs={[{ label: "Agenda", href: `/t/${tenant}/agenda` }]}
      title="Agenda"
    >
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground">{totalCount} garantias com ações pendentes</p>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 grid w-full grid-cols-3">
              <TabsTrigger value="hoje" className="gap-2">
                <Clock className="h-4 w-4" />
                <span>Hoje</span>
                {grouped.today.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {grouped.today.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="atrasadas" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Atrasadas</span>
                {grouped.overdue.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {grouped.overdue.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="proximos" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span>7 Dias</span>
                {grouped.next7Days.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
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
            <Button variant="outline" onClick={() => setContactDialog({ open, ticket: null })}>
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
