"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"
import { ROLE_PERMISSIONS } from "@/lib/permissions"
import type { Role } from "@/lib/schemas"

const ROLES: { value: Role; label: string }[] = [
  { value: "RECEBEDOR", label: "Recebedor" },
  { value: "INTERNO", label: "Interno" },
  { value: "LOGISTICA", label: "Logística" },
  { value: "COBRANCA", label: "Cobrança" },
  { value: "ADMIN", label: "Admin" },
]

const PERMISSIONS: { key: keyof (typeof ROLE_PERMISSIONS)["ADMIN"]; label: string }[] = [
  { key: "canCreateTicket", label: "Criar ticket" },
  { key: "canEditRecebimento", label: "Editar recebimento" },
  { key: "canDefineSupplier", label: "Definir fornecedor" },
  { key: "canAdvanceFromInterno", label: "Avançar de Interno" },
  { key: "canRegisterLogistica", label: "Registrar logística" },
  { key: "canAttachCanhoto", label: "Anexar canhoto" },
  { key: "canAddTimeline", label: "Adicionar timeline" },
  { key: "canSetNextAction", label: "Definir próxima ação" },
  { key: "canResolve", label: "Resolver" },
  { key: "canClose", label: "Encerrar" },
  { key: "canRevertStage", label: "Voltar etapa" },
  { key: "canAccessAdmin", label: "Acessar admin" },
  { key: "canSeeAudit", label: "Ver auditoria" },
]

export function RolesTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Matriz de Permissões</CardTitle>
        <CardDescription>Visão geral das permissões por papel (somente leitura)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background">Ação</TableHead>
                {ROLES.map((role) => (
                  <TableHead key={role.value} className="text-center">
                    <Badge variant="outline">{role.label}</Badge>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((perm) => (
                <TableRow key={perm.key}>
                  <TableCell className="sticky left-0 bg-background font-medium">{perm.label}</TableCell>
                  {ROLES.map((role) => {
                    const hasPermission = ROLE_PERMISSIONS[role.value][perm.key]
                    return (
                      <TableCell key={role.value} className="text-center">
                        {hasPermission ? (
                          <Check className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
