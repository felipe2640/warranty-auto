"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { AppLayout } from "@/components/app-layout"
import { Calendar, AlertTriangle, Inbox, FileSearch, Truck, Phone, CheckCircle, Plus, ArrowRight } from "lucide-react"
import type { Ticket, Status, Store, Role } from "@/lib/schemas"

interface DashboardStats {
  total: number
  byStatus: Partial<Record<Status, number>>
  todayActions: number
  overdue: number
  resolved30Days: number
  todayTickets: (Ticket & { storeName?: string })[]
  overdueTickets: (Ticket & { storeName?: string })[]
}

interface DashboardClientProps {
  stats: DashboardStats
  stores: Store[]
  tenant: string
  userName: string
  userRole: Role
  userStoreId?: string
}

export function DashboardClient({ stats, stores, tenant, userName, userRole, userStoreId }: DashboardClientProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>(userStoreId || "all")

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId)
    // In a real app, you'd refetch data with the new store filter
  }

  const formatDate = (date?: Date | string) => {
    if (!date) return "—"
    const d = new Date(date)
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  }

  const getDaysOverdue = (date?: Date | string) => {
    if (!date) return 0
    const d = new Date(date)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  return (
    <AppLayout
      tenant={tenant}
      userName={userName}
      userRole={userRole}
      breadcrumbs={[{ label: "Dashboard" }]}
      stores={stores.length > 1 ? stores : undefined}
      currentStoreId={selectedStoreId}
      onStoreChange={stores.length > 1 ? handleStoreChange : undefined}
      title="Dashboard"
      actions={
        <Button asChild size="sm">
          <Link href={`/t/${tenant}/warranty/new`}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nova Garantia</span>
          </Link>
        </Button>
      }
    >
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {/* Ações de Hoje */}
            <Link href={`/t/${tenant}/agenda?tab=hoje`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Ações de Hoje</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todayActions}</div>
                </CardContent>
              </Card>
            </Link>

            {/* Atrasadas */}
            <Link href={`/t/${tenant}/agenda?tab=atrasadas`}>
              <Card
                className={`hover:bg-muted/50 transition-colors cursor-pointer h-full ${stats.overdue > 0 ? "border-destructive" : ""}`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Atrasadas</CardTitle>
                  <AlertTriangle
                    className={`h-4 w-4 ${stats.overdue > 0 ? "text-destructive" : "text-muted-foreground"}`}
                  />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stats.overdue > 0 ? "text-destructive" : ""}`}>
                    {stats.overdue}
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Em Recebimento */}
            <Link href={`/t/${tenant}/warranty?status=RECEBIMENTO`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Recebimento</CardTitle>
                  <Inbox className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.byStatus["RECEBIMENTO"] || 0}</div>
                </CardContent>
              </Card>
            </Link>

            {/* Em Interno */}
            <Link href={`/t/${tenant}/warranty?status=INTERNO`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Interno</CardTitle>
                  <FileSearch className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.byStatus["INTERNO"] || 0}</div>
                </CardContent>
              </Card>
            </Link>

            {/* Em Logística */}
            <Link href={`/t/${tenant}/warranty?status=ENTREGA_LOGISTICA`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Logística</CardTitle>
                  <Truck className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.byStatus["ENTREGA_LOGISTICA"] || 0}</div>
                </CardContent>
              </Card>
            </Link>

            {/* Em Cobrança */}
            <Link href={`/t/${tenant}/warranty?status=COBRANCA_ACOMPANHAMENTO`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Cobrança</CardTitle>
                  <Phone className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.byStatus["COBRANCA_ACOMPANHAMENTO"] || 0}</div>
                </CardContent>
              </Card>
            </Link>

            {/* Resolvidas 30 dias */}
            <Link href={`/t/${tenant}/warranty?status=ENCERRADO`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Resolvidas (30d)</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.resolved30Days}</div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Lists */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ações de Hoje */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Ações de Hoje</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/t/${tenant}/agenda?tab=hoje`}>
                    Ver todas
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {stats.todayTickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma ação para hoje</p>
                ) : (
                  <div className="space-y-3">
                    {stats.todayTickets.map((ticket) => (
                      <Link
                        key={ticket.id}
                        href={`/t/${tenant}/warranty/${ticket.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium">
                              #{ticket.id.substring(0, 6).toUpperCase()}
                            </span>
                            <StatusBadge status={ticket.status} size="sm" />
                          </div>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {ticket.nomeRazaoSocial} • {ticket.supplierName || "Sem fornecedor"}
                          </p>
                        </div>
                        <div className="ml-2 text-right text-xs text-muted-foreground shrink-0">
                          {formatDate(ticket.nextActionAt)}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Atrasadas */}
            <Card className={stats.overdue > 0 ? "border-destructive/50" : ""}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  Atrasadas
                  {stats.overdue > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/t/${tenant}/agenda?tab=atrasadas`}>
                    Ver todas
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {stats.overdueTickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhuma garantia atrasada</p>
                ) : (
                  <div className="space-y-3">
                    {stats.overdueTickets.map((ticket) => {
                      const daysOver = getDaysOverdue(ticket.dueDate || ticket.nextActionAt)
                      return (
                        <Link
                          key={ticket.id}
                          href={`/t/${tenant}/warranty/${ticket.id}`}
                          className="flex items-center justify-between rounded-lg border border-destructive/30 p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">
                                #{ticket.id.substring(0, 6).toUpperCase()}
                              </span>
                              <StatusBadge status={ticket.status} size="sm" />
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {ticket.nomeRazaoSocial} • {ticket.supplierName || "Sem fornecedor"}
                            </p>
                          </div>
                          <div className="ml-2 text-right shrink-0">
                            <span className="text-xs font-medium text-destructive">{daysOver}d atraso</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
