"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge, STATUS_CONFIG } from "@/components/ui/status-badge"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Filter, X, AlertTriangle, Grid, List } from "lucide-react"
import type { Ticket, Store, Status } from "@/lib/schemas"

interface WarrantyListClientProps {
  tickets: Ticket[]
  stores: Store[]
  tenant: string
  userRole: string
  initialFilters: {
    status?: string
    storeId?: string
    q?: string
    overSla?: string
  }
}

const ALL_STATUSES: Status[] = [
  "ABERTO",
  "INTERNO",
  "COM_FORNECEDOR",
  "RETORNO_FORNECEDOR",
  "RESOLUCAO",
  "ENTREGA_LOGISTICA",
  "FECHADO",
  "CANCELADO",
]

export function WarrantyListClient({ tickets, stores, tenant, userRole, initialFilters }: WarrantyListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchQuery, setSearchQuery] = useState(initialFilters.q || "")
  const [statusFilter, setStatusFilter] = useState(initialFilters.status || "all")
  const [storeFilter, setStoreFilter] = useState(initialFilters.storeId || "all")
  const [showOverSla, setShowOverSla] = useState(initialFilters.overSla === "true")
  const [viewMode, setViewMode] = useState<"table" | "cards">("table")

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`/t/${tenant}/warranty?${params.toString()}`)
  }

  const handleSearch = () => {
    updateFilters({ q: searchQuery || undefined })
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    updateFilters({ status: value === "all" ? undefined : value })
  }

  const handleStoreChange = (value: string) => {
    setStoreFilter(value)
    updateFilters({ storeId: value === "all" ? undefined : value })
  }

  const toggleOverSla = () => {
    const newValue = !showOverSla
    setShowOverSla(newValue)
    updateFilters({ overSla: newValue ? "true" : undefined })
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setStoreFilter("all")
    setShowOverSla(false)
    router.push(`/t/${tenant}/warranty`)
  }

  const hasFilters = searchQuery || statusFilter !== "all" || storeFilter !== "all" || showOverSla

  const isOverSla = (ticket: Ticket) => {
    if (!ticket.slaDeadline || ["FECHADO", "CANCELADO"].includes(ticket.status)) return false
    return new Date(ticket.slaDeadline) < new Date()
  }

  const getStoreName = (storeId: string) => {
    return stores.find((s) => s.id === storeId)?.name || storeId
  }

  return (
    <SidebarProvider>
      <AppSidebar tenant={tenant} userRole={userRole} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Garantias</h1>
          </div>
          <Button asChild>
            <Link href={`/t/${tenant}/warranty/new`}>
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Nova Garantia</span>
              <span className="sm:hidden">Nova</span>
            </Link>
          </Button>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  {/* Search */}
                  <div className="flex flex-1 gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar protocolo, cliente, peça..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={handleSearch}>Buscar</Button>
                  </div>

                  {/* Filter dropdowns */}
                  <div className="flex flex-wrap gap-2">
                    <Select value={statusFilter} onValueChange={handleStatusChange}>
                      <SelectTrigger className="w-[160px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos Status</SelectItem>
                        {ALL_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {STATUS_CONFIG[status].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {userRole !== "operador" && (
                      <Select value={storeFilter} onValueChange={handleStoreChange}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Loja" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas Lojas</SelectItem>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button variant={showOverSla ? "destructive" : "outline"} size="sm" onClick={toggleOverSla}>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      SLA Estourado
                    </Button>

                    {hasFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-2 h-4 w-4" />
                        Limpar
                      </Button>
                    )}

                    <div className="ml-auto hidden lg:flex">
                      <Button
                        variant={viewMode === "table" ? "default" : "outline"}
                        size="icon"
                        onClick={() => setViewMode("table")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "cards" ? "default" : "outline"}
                        size="icon"
                        onClick={() => setViewMode("cards")}
                        className="ml-1"
                      >
                        <Grid className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {tickets.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-muted-foreground">Nenhuma garantia encontrada</p>
                  {hasFilters && (
                    <Button variant="link" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Peça</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Loja</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>SLA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/t/${tenant}/warranty/${ticket.id}`)}
                        >
                          <TableCell className="font-mono font-medium">{ticket.protocol}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{ticket.customerName}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{ticket.partName}</TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.status} size="sm" />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getStoreName(ticket.storeId)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            {isOverSla(ticket) ? (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Estourado
                              </Badge>
                            ) : ticket.slaDeadline ? (
                              <span className="text-sm text-muted-foreground">
                                {new Date(ticket.slaDeadline).toLocaleDateString("pt-BR")}
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/t/${tenant}/warranty/${ticket.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">{ticket.protocol}</span>
                        <StatusBadge status={ticket.status} size="sm" />
                      </div>
                      <p className="font-medium">{ticket.customerName}</p>
                      <p className="text-sm text-muted-foreground">{ticket.partName}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{getStoreName(ticket.storeId)}</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                      {isOverSla(ticket) && (
                        <Badge variant="destructive" className="mt-2 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          SLA Estourado
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Results count */}
            <p className="text-center text-sm text-muted-foreground">
              Mostrando {tickets.length} garantia{tickets.length !== 1 && "s"}
            </p>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
