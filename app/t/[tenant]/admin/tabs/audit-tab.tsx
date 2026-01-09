"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, ArrowRight } from "lucide-react"
import type { AuditEntry } from "@/lib/schemas"

interface AuditTabProps {
  tenant: string
}

export function AuditTab({ tenant }: AuditTabProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    userId: "",
    ticketId: "",
    action: "all",
  })

  useEffect(() => {
    fetchAudit()
  }, [])

  const fetchAudit = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.set("startDate", filters.startDate)
      if (filters.endDate) params.set("endDate", filters.endDate)
      if (filters.userId) params.set("userId", filters.userId)
      if (filters.ticketId) params.set("ticketId", filters.ticketId)
      if (filters.action !== "all") params.set("action", filters.action)

      const res = await fetch(`/api/admin/audit?${params.toString()}`)
      const data = await res.json()
      setEntries(data.entries || [])
    } catch (error) {
      console.error("[v0] Error fetching audit:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case "STATUS_CHANGE":
        return <Badge className="bg-blue-100 text-blue-800">Mudança Status</Badge>
      case "ADMIN_REVERT":
        return <Badge className="bg-orange-100 text-orange-800">Reversão</Badge>
      case "UPLOAD":
        return <Badge className="bg-green-100 text-green-800">Upload</Badge>
      case "CREATE":
        return <Badge className="bg-purple-100 text-purple-800">Criação</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditoria</CardTitle>
        <CardDescription>Histórico de ações do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>ID do Ticket</Label>
            <Input
              value={filters.ticketId}
              onChange={(e) => setFilters({ ...filters, ticketId: e.target.value })}
              placeholder="Ex: abc123"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={filters.action} onValueChange={(v) => setFilters({ ...filters, action: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="STATUS_CHANGE">Mudança Status</SelectItem>
                <SelectItem value="ADMIN_REVERT">Reversão</SelectItem>
                <SelectItem value="UPLOAD">Upload</SelectItem>
                <SelectItem value="CREATE">Criação</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={fetchAudit} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Buscar
            </Button>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum registro encontrado</div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell className="font-medium">{entry.userName}</TableCell>
                    <TableCell>
                      <code className="text-xs">{entry.ticketId.substring(0, 6).toUpperCase()}</code>
                    </TableCell>
                    <TableCell>{getActionBadge(entry.action)}</TableCell>
                    <TableCell>
                      {entry.fromStatus && entry.toStatus && (
                        <div className="flex items-center gap-1 text-xs">
                          <span>{entry.fromStatus}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span>{entry.toStatus}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {entry.reason || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
