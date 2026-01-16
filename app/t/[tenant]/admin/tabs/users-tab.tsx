"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, MoreHorizontal, Loader2, UserCheck, UserX, Key } from "lucide-react"
import { formatTenantEmail } from "@/lib/auth/identifier"
import type { User, Store, Role } from "@/lib/schemas"

interface UsersTabProps {
  users: User[]
  stores: Store[]
  tenant: string
  onRefresh?: () => void
}

const ROLES: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "COBRANCA", label: "Cobrança" },
  { value: "LOGISTICA", label: "Logística" },
  { value: "INTERNO", label: "Interno" },
  { value: "RECEBEDOR", label: "Recebedor" },
]

export function UsersTab({ users, stores, tenant, onRefresh }: UsersTabProps) {
  const router = useRouter()
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<Role>("RECEBEDOR")
  const [storeId, setStoreId] = useState<string>("")
  const [active, setActive] = useState(true)

  const resetForm = () => {
    setUsername("")
    setPassword("")
    setName("")
    setRole("RECEBEDOR")
    setStoreId("")
    setActive(true)
    setEditingUser(null)
    setError(null)
  }

  const openCreateSheet = () => {
    resetForm()
    setIsSheetOpen(true)
  }

  const openEditSheet = (user: User) => {
    setEditingUser(user)
    setUsername("")
    setName(user.name)
    setRole(user.role)
    setStoreId(user.storeId || "")
    setActive(user.active)
    setIsSheetOpen(true)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      let response: Response
      if (editingUser) {
        response = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, role, storeId: storeId || null, active }),
        })
      } else {
        response = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, name, role, storeId: storeId || null }),
        })
      }

      const responseData = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(responseData.error || "Erro ao salvar usuário")
        return
      }

      setIsSheetOpen(false)
      resetForm()
      onRefresh ? onRefresh() : router.refresh()
    } catch (error) {
      console.error("[v0] Error saving user:", error)
      setError("Erro inesperado ao salvar usuário")
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleUserActive = async (user: User) => {
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      })
      onRefresh ? onRefresh() : router.refresh()
    } catch (error) {
      console.error("[v0] Error toggling user:", error)
    }
  }

  const resetPassword = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, { method: "POST" })
      const data = await res.json()
      if (data.resetLink) {
        alert(`Link de reset: ${data.resetLink}`)
      }
    } catch (error) {
      console.error("[v0] Error resetting password:", error)
    }
  }

  const normalizeUserEmail = async (user: User) => {
    const baseUsername = user.email.split("@")[0]
    const normalizedEmail = formatTenantEmail(baseUsername, tenant)
    if (normalizedEmail === user.email) {
      return
    }

    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      onRefresh ? onRefresh() : router.refresh()
    } catch (error) {
      console.error("[v0] Error normalizing email:", error)
      setError("Erro ao normalizar email do usuário")
    }
  }

  const needsEmailNormalization = (email: string) => !email.toLowerCase().endsWith(`@${tenant}.sys`)

  const getStoreName = (storeId?: string) => {
    if (!storeId) return "—"
    return stores.find((s) => s.id === storeId)?.name || storeId
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>Gerencie os usuários do sistema</CardDescription>
          </div>
          <Button onClick={openCreateSheet}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Loja Padrão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ROLES.find((r) => r.value === user.role)?.label || user.role}</Badge>
                    </TableCell>
                    <TableCell>{getStoreName(user.storeId)}</TableCell>
                    <TableCell>
                      {user.active ? (
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
                          <DropdownMenuItem onClick={() => openEditSheet(user)}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetPassword(user.id)}>
                            <Key className="mr-2 h-4 w-4" />
                            Resetar Senha
                          </DropdownMenuItem>
                          {needsEmailNormalization(user.email) && (
                            <DropdownMenuItem onClick={() => normalizeUserEmail(user)}>
                              Normalizar Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => toggleUserActive(user)}>
                            {user.active ? (
                              <>
                                <UserX className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {users.map((user) => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {ROLES.find((r) => r.value === user.role)?.label || user.role}
                        </Badge>
                        {user.active ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditSheet(user)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => resetPassword(user.id)}>Resetar Senha</DropdownMenuItem>
                        {needsEmailNormalization(user.email) && (
                          <DropdownMenuItem onClick={() => normalizeUserEmail(user)}>Normalizar Email</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => toggleUserActive(user)}>
                          {user.active ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Sheet */}
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open)
          if (!open) resetForm()
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</SheetTitle>
          </SheetHeader>

          <>
            <div className="space-y-4 py-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {!editingUser && (
                <>
                  <div className="space-y-2">
                    <Label>Nome de Usuário *</Label>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Digite o nome de usuário"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
              </div>

              <div className="space-y-2">
                <Label>Papel *</Label>
                <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Loja Padrão</Label>
                <Select value={storeId || "none"} onValueChange={(v) => setStoreId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {stores
                      .filter((s) => s.active)
                      .map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {editingUser && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label>Ativo</Label>
                    <p className="text-sm text-muted-foreground">Usuário pode acessar o sistema</p>
                  </div>
                  <Switch checked={active} onCheckedChange={setActive} />
                </div>
              )}
            </div>

            <SheetFooter>
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || (!editingUser && (!username || !password || !name))}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : editingUser ? (
                  "Salvar"
                ) : (
                  "Criar"
                )}
              </Button>
            </SheetFooter>
          </>
        </SheetContent>
      </Sheet>
    </>
  )
}
