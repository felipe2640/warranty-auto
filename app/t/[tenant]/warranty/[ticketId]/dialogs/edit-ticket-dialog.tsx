"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, AlertCircle } from "lucide-react"
import type { Supplier, Store, Ticket, TimelineEntry, UpdateTicketDetailsInput } from "@/lib/schemas"
import { UpdateTicketDetailsSchema } from "@/lib/schemas"
import { formatCpfCnpj, formatPhoneBR, onlyDigits } from "@/lib/format"
import { useIsMobile } from "@/hooks/use-mobile"

interface EditTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: Ticket & { storeName: string; supplierName?: string }
  stores: Store[]
  suppliers: Supplier[]
  canEditCustomer: boolean
  canEditPiece: boolean
  canEditStore: boolean
  canEditSupplier: boolean
  onUpdated: (ticket: Ticket & { storeName?: string; supplierName?: string }, timelineEntry?: TimelineEntry) => void
}

export function EditTicketDialog({
  open,
  onOpenChange,
  ticket,
  stores,
  suppliers,
  canEditCustomer,
  canEditPiece,
  canEditStore,
  canEditSupplier,
  onUpdated,
}: EditTicketDialogProps) {
  const isMobile = useIsMobile()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeStores = useMemo(() => stores.filter((store) => store.active || store.id === ticket.storeId), [stores, ticket.storeId])
  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.active || supplier.id === ticket.supplierId),
    [suppliers, ticket.supplierId],
  )

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<UpdateTicketDetailsInput>({
    resolver: zodResolver(UpdateTicketDetailsSchema),
    mode: "onSubmit",
    defaultValues: {
      nomeRazaoSocial: ticket.nomeRazaoSocial,
      nomeFantasiaApelido: ticket.nomeFantasiaApelido,
      cpfCnpj: ticket.cpfCnpj,
      celular: ticket.celular,
      isWhatsapp: ticket.isWhatsapp,
      descricaoPeca: ticket.descricaoPeca,
      quantidade: ticket.quantidade,
      ref: ticket.ref,
      codigo: ticket.codigo,
      defeitoPeca: ticket.defeitoPeca,
      numeroVendaOuCfe: ticket.numeroVendaOuCfe,
      numeroVendaOuCfeFornecedor: ticket.numeroVendaOuCfeFornecedor,
      obs: ticket.obs,
      storeId: ticket.storeId,
      supplierId: ticket.supplierId,
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      nomeRazaoSocial: ticket.nomeRazaoSocial,
      nomeFantasiaApelido: ticket.nomeFantasiaApelido,
      cpfCnpj: ticket.cpfCnpj,
      celular: ticket.celular,
      isWhatsapp: ticket.isWhatsapp,
      descricaoPeca: ticket.descricaoPeca,
      quantidade: ticket.quantidade,
      ref: ticket.ref,
      codigo: ticket.codigo,
      defeitoPeca: ticket.defeitoPeca,
      numeroVendaOuCfe: ticket.numeroVendaOuCfe,
      numeroVendaOuCfeFornecedor: ticket.numeroVendaOuCfeFornecedor,
      obs: ticket.obs,
      storeId: ticket.storeId,
      supplierId: ticket.supplierId,
    })
  }, [open, reset, ticket])

  useEffect(() => {
    if (!open) {
      setError(null)
    }
  }, [open])

  const supplierValue = watch("supplierId") || "none"
  const storeValue = watch("storeId") || ""

  const onSubmit = async (data: UpdateTicketDetailsInput) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || "Erro ao atualizar ticket")
        return
      }

      onUpdated(result.ticket, result.timelineEntry)
      handleClose()
    } catch {
      setError("Erro ao atualizar ticket")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setError(null)
    onOpenChange(false)
  }

  const content = (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Accordion type="multiple" defaultValue={["cliente", "peca", "loja"]}>
        {canEditCustomer && (
          <AccordionItem value="cliente">
            <AccordionTrigger>Cliente</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome/Razão Social *</Label>
                <Input {...register("nomeRazaoSocial")} />
                {errors.nomeRazaoSocial && <p className="text-sm text-destructive">{errors.nomeRazaoSocial.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Nome Fantasia/Apelido</Label>
                <Input {...register("nomeFantasiaApelido")} />
              </div>

              <div className="space-y-2">
                <Label>CPF/CNPJ *</Label>
                <Controller
                  control={control}
                  name="cpfCnpj"
                  render={({ field }) => (
                    <Input
                      value={formatCpfCnpj(field.value || "")}
                      onChange={(event) => field.onChange(onlyDigits(event.target.value))}
                    />
                  )}
                />
                {errors.cpfCnpj && <p className="text-sm text-destructive">{errors.cpfCnpj.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Celular *</Label>
                <Controller
                  control={control}
                  name="celular"
                  render={({ field }) => (
                    <Input
                      value={formatPhoneBR(field.value || "")}
                      onChange={(event) => field.onChange(onlyDigits(event.target.value))}
                    />
                  )}
                />
                {errors.celular && <p className="text-sm text-destructive">{errors.celular.message}</p>}
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="isWhatsapp"
                  checked={watch("isWhatsapp") ?? false}
                  onCheckedChange={(checked) => setValue("isWhatsapp", checked)}
                />
                <Label htmlFor="isWhatsapp">WhatsApp</Label>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {canEditPiece && (
          <AccordionItem value="peca">
            <AccordionTrigger>Peça</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Input {...register("descricaoPeca")} />
                {errors.descricaoPeca && <p className="text-sm text-destructive">{errors.descricaoPeca.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input type="number" min={1} {...register("quantidade", { valueAsNumber: true })} />
                {errors.quantidade && <p className="text-sm text-destructive">{errors.quantidade.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Referência</Label>
                <Input {...register("ref")} />
              </div>

              <div className="space-y-2">
                <Label>Código</Label>
                <Input {...register("codigo")} />
              </div>

              <div className="space-y-2">
                <Label>Defeito *</Label>
                <Input {...register("defeitoPeca")} />
                {errors.defeitoPeca && <p className="text-sm text-destructive">{errors.defeitoPeca.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Número da venda/CFe *</Label>
                <Input {...register("numeroVendaOuCfe")} />
                {errors.numeroVendaOuCfe && <p className="text-sm text-destructive">{errors.numeroVendaOuCfe.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Número fornecedor</Label>
                <Input {...register("numeroVendaOuCfeFornecedor")} />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea {...register("obs")} rows={3} />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {(canEditStore || canEditSupplier) && (
          <AccordionItem value="loja">
            <AccordionTrigger>Loja & Fornecedor</AccordionTrigger>
            <AccordionContent className="space-y-4">
              {canEditStore && (
                <div className="space-y-2">
                  <Label>Loja</Label>
                  <Select
                    value={storeValue}
                    onValueChange={(value) => setValue("storeId", value, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma loja" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeStores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.storeId && <p className="text-sm text-destructive">{errors.storeId.message}</p>}
                </div>
              )}

              {canEditSupplier && (
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Select
                    value={supplierValue}
                    onValueChange={(value) =>
                      setValue("supplierId", value === "none" ? undefined : value, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem fornecedor</SelectItem>
                      {activeSuppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <DialogFooter className="gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar alterações"
          )}
        </Button>
      </DialogFooter>
    </form>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh]">
          <SheetHeader>
            <SheetTitle>Editar ticket</SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 h-[calc(90vh-4.5rem)] pr-4">
            {content}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar ticket</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          {content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
