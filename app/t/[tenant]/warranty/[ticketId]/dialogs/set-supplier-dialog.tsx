"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import type { Supplier, Ticket } from "@/lib/schemas"
import { ErpSupplierResolutionDialog } from "./erp-supplier-resolution-dialog"

interface SetSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket
  suppliers: Supplier[]
  onSuccess: () => void
}

export function SetSupplierDialog({ open, onOpenChange, ticket, suppliers, onSuccess }: SetSupplierDialogProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResolverDialog, setShowResolverDialog] = useState(false)

  const resetState = () => {
    setSelectedSupplier(null)
    setError(null)
    setIsSubmitting(false)
    setShowResolverDialog(false)
  }

  const handleSave = async () => {
    if (!selectedSupplier) {
      setError("Selecione um fornecedor do ERP")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: selectedSupplier.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao definir fornecedor")
        return
      }

      onSuccess()
      onOpenChange(false)
      resetState()
    } catch {
      setError("Erro ao definir fornecedor")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          resetState()
        }
        onOpenChange(newOpen)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Definir fornecedor</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 py-2">
          <Button type="button" variant="outline" onClick={() => setShowResolverDialog(true)}>
            Selecionar no ERP
          </Button>

          {selectedSupplier ? (
            <div className="rounded-lg border p-3 text-sm">
              <div className="font-medium">{selectedSupplier.name}</div>
              <div className="text-muted-foreground">SLA {selectedSupplier.slaDays} dias</div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              O fornecedor é resolvido pelo ERP a partir do código do produto do ticket.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !selectedSupplier}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ErpSupplierResolutionDialog
        open={showResolverDialog}
        onOpenChange={setShowResolverDialog}
        productCode={ticket.codigo}
        productDescription={ticket.descricaoPeca}
        localSuppliers={suppliers}
        initialLocalSupplierId={ticket.supplierId}
        onResolved={(supplier) => {
          setSelectedSupplier(supplier)
          setError(null)
        }}
      />
    </Dialog>
  )
}
