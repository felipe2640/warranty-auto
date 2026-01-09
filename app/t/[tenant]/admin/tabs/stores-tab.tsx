"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Loader2 } from "lucide-react"
import type { Store } from "@/lib/schemas"

interface StoresTabProps {
  stores: Store[]
  onRefresh: () => void
}

export function StoresTab({ stores, onRefresh }: StoresTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [cnpj, setCnpj] = useState("")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")

  const resetForm = () => {
    setName("")
    setCnpj("")
    setAddress("")
    setPhone("")
    setEditingStore(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (store: Store) => {
    setEditingStore(store)
    setName(store.name)
    setCnpj(store.cnpj || "")
    setAddress(store.address || "")
    setPhone(store.phone || "")
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (editingStore) {
        await fetch(`/api/admin/stores/${editingStore.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, cnpj, address, phone }),
        })
      } else {
        await fetch("/api/admin/stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, cnpj, address, phone }),
        })
      }

      setIsDialogOpen(false)
      resetForm()
      onRefresh()
    } catch (error) {
      console.error("Error saving store:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleStoreActive = async (store: Store) => {
    try {
      await fetch(`/api/admin/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !store.active }),
      })
      onRefresh()
    } catch (error) {
      console.error("Error toggling store:", error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lojas</CardTitle>
            <CardDescription>Gerencie as lojas do sistema</CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Loja
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.cnpj || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{store.address || "-"}</TableCell>
                  <TableCell>{store.phone || "-"}</TableCell>
                  <TableCell>
                    {store.active ? (
                      <Badge className="bg-green-100 text-green-800">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
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
                        <DropdownMenuItem onClick={() => openEditDialog(store)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStoreActive(store)}>
                          {store.active ? "Desativar" : "Ativar"}
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
            <DialogTitle>{editingStore ? "Editar Loja" : "Nova Loja"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da loja" />
            </div>

            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>

            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço completo" />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
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
              ) : editingStore ? (
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
