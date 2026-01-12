"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Loader2 } from "lucide-react"
import type { Supplier } from "@/lib/schemas"
import { formatCpfCnpj, formatPhoneBR, onlyDigits } from "@/lib/format"

interface SuppliersTabProps {
  suppliers: Supplier[]
  onRefresh?: () => void
}

export function SuppliersTab({ suppliers, onRefresh }: SuppliersTabProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [slaDays, setSlaDays] = useState("30")

  const resetForm = () => {
    setName("")
    setCnpj("")
    setEmail("")
    setPhone("")
    setSlaDays("30")
    setEditingSupplier(null)
    setError(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setName(supplier.name)
    setCnpj(onlyDigits(supplier.cnpj || ""))
    setEmail(supplier.email || "")
    setPhone(onlyDigits(supplier.phone || ""))
    setSlaDays(String(supplier.slaDays))
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      const data = {
        name,
        cnpj,
        email,
        phone,
        slaDays: Number.parseInt(slaDays) || 30,
      }

      let response: Response
      if (editingSupplier) {
        response = await fetch(`/api/admin/suppliers/${editingSupplier.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      } else {
        response = await fetch("/api/admin/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      }

      const responseData = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(responseData.error || "Erro ao salvar fornecedor")
        return
      }

      setIsDialogOpen(false)
      resetForm()
      onRefresh ? onRefresh() : router.refresh()
    } catch (error) {
      console.error("Error saving supplier:", error)
      setError("Erro inesperado ao salvar fornecedor")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleSupplierActive = async (supplier: Supplier) => {
    try {
      await fetch(`/api/admin/suppliers/${supplier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !supplier.active }),
      })
      onRefresh ? onRefresh() : router.refresh()
    } catch (error) {
      console.error("Error toggling supplier:", error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fornecedores</CardTitle>
            <CardDescription>Gerencie os fornecedores de garantia</CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Fornecedor
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>SLA (dias)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.cnpj ? formatCpfCnpj(supplier.cnpj) : "-"}</TableCell>
                  <TableCell>{supplier.email || "-"}</TableCell>
                  <TableCell>{supplier.phone ? formatPhoneBR(supplier.phone) : "-"}</TableCell>
                  <TableCell>{supplier.slaDays}</TableCell>
                  <TableCell>
                    {supplier.active ? (
                      <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(supplier)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleSupplierActive(supplier)}>
                          {supplier.active ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do fornecedor" />
            </div>

            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={formatCpfCnpj(cnpj)}
                onChange={(e) => setCnpj(onlyDigits(e.target.value).slice(0, 14))}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@fornecedor.com"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formatPhoneBR(phone)}
                onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 11))}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label>SLA (dias) *</Label>
              <Input
                type="number"
                value={slaDays}
                onChange={(e) => setSlaDays(e.target.value)}
                placeholder="30"
                min="1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !name}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : editingSupplier ? (
                "Salvar"
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
