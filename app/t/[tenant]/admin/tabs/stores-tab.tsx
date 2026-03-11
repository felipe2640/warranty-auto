"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ErpStore } from "@/lib/erp/types"

interface StoresTabProps {
  stores: ErpStore[]
  onRefresh?: () => void
}

export function StoresTab({ stores }: StoresTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lojas (ERP)</CardTitle>
        <CardDescription>Lista sincronizada com o ERP. Alterações devem ser feitas no ERP.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nome Fantasia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  Nenhuma loja encontrada no ERP.
                </TableCell>
              </TableRow>
            ) : (
              stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.id}</TableCell>
                  <TableCell>{store.nomeFantasia}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
