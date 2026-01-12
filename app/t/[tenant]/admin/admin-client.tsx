"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AppLayout } from "@/components/app-layout"
import { Users, Building2, Truck, Settings, FileSearch, AlertTriangle, Plus, Shield, FolderOpen } from "lucide-react"
import { UsersTab } from "./tabs/users-tab"
import { StoresTab } from "./tabs/stores-tab"
import { SuppliersTab } from "./tabs/suppliers-tab"
import { SettingsTab } from "./tabs/settings-tab"
import { AuditTab } from "./tabs/audit-tab"
import { RolesTab } from "./tabs/roles-tab"
import type { User, Store, Supplier, TenantSettings, Role } from "@/lib/schemas"

interface AdminClientProps {
  users: User[]
  stores: Store[]
  suppliers: Supplier[]
  settings: TenantSettings
  openTicketsCount: number
  tenant: string
  tenantName?: string
  userName: string
  userRole: Role
}

export function AdminClient({
  users,
  stores,
  suppliers,
  settings,
  openTicketsCount,
  tenant,
  tenantName,
  userName,
  userRole,
}: AdminClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "home")

  const handleRefresh = () => {
    router.refresh()
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`?tab=${value}`, { scroll: false })
  }

  const activeUsers = users.filter((u) => u.active).length
  const activeStores = stores.filter((s) => s.active).length
  const activeSuppliers = suppliers.filter((s) => s.active).length
  const hasDriveConfig = !!settings.driveRootFolderId

  return (
    <AppLayout
      tenant={tenant}
      tenantName={tenantName}
      userName={userName}
      userRole={userRole}
      breadcrumbs={[{ label: "Admin", href: `/t/${tenant}/admin` }]}
      title="Administração"
    >
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
              <TabsTrigger value="home" className="gap-1">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Início</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Usuários</span>
              </TabsTrigger>
              <TabsTrigger value="stores" className="gap-1">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Lojas</span>
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="gap-1">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Fornecedores</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1">
                <FolderOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Configurações</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1">
                <FileSearch className="h-4 w-4" />
                <span className="hidden sm:inline">Auditoria</span>
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-1">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Papéis</span>
              </TabsTrigger>
            </TabsList>

            {/* Home Tab */}
            <TabsContent value="home">
              <div className="space-y-6">
                {/* Alerts */}
                {!hasDriveConfig && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Drive não configurado</AlertTitle>
                    <AlertDescription>
                      Configure o ID da pasta raiz do Google Drive para habilitar o upload de anexos.
                      <Button variant="link" className="h-auto p-0 ml-2" onClick={() => handleTabChange("settings")}>
                        Configurar agora
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Stats Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleTabChange("users")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeUsers}</div>
                      <p className="text-xs text-muted-foreground">{users.length} total</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleTabChange("stores")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Lojas</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeStores}</div>
                      <p className="text-xs text-muted-foreground">{stores.length} total</p>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-muted/50" onClick={() => handleTabChange("suppliers")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Fornecedores</CardTitle>
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{activeSuppliers}</div>
                      <p className="text-xs text-muted-foreground">{suppliers.length} total</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
                      <FileSearch className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{openTicketsCount}</div>
                      <p className="text-xs text-muted-foreground">em andamento</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ações Rápidas</CardTitle>
                    <CardDescription>Acesse rapidamente as configurações mais usadas</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 bg-transparent"
                      onClick={() => handleTabChange("settings")}
                    >
                      <FolderOpen className="h-5 w-5" />
                      <span>Configurar Drive</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 bg-transparent"
                      onClick={() => handleTabChange("users")}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Criar Usuário</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 bg-transparent"
                      onClick={() => handleTabChange("suppliers")}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Criar Fornecedor</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2 bg-transparent"
                      onClick={() => handleTabChange("stores")}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Criar Loja</span>
                    </Button>
                  </CardContent>
                </Card>

                {/* Integration Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status das Integrações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Google Drive</p>
                          <p className="text-sm text-muted-foreground">
                            {hasDriveConfig ? `Pasta: ${settings.driveRootFolderId}` : "Não configurado"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasDriveConfig ? (
                          <span className="flex h-2 w-2 rounded-full bg-green-500" />
                        ) : (
                          <span className="flex h-2 w-2 rounded-full bg-red-500" />
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleTabChange("settings")}>
                          {hasDriveConfig ? "Testar" : "Configurar"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <UsersTab users={users} stores={stores} onRefresh={handleRefresh} />
            </TabsContent>

            <TabsContent value="stores">
              <StoresTab stores={stores} onRefresh={handleRefresh} />
            </TabsContent>

            <TabsContent value="suppliers">
              <SuppliersTab suppliers={suppliers} onRefresh={handleRefresh} />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab settings={settings} onRefresh={handleRefresh} />
            </TabsContent>

            <TabsContent value="audit">
              <AuditTab tenant={tenant} />
            </TabsContent>

            <TabsContent value="roles">
              <RolesTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}
