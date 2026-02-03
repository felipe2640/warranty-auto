"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CreateTicketFormSchema, type CreateTicketFormData } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SignaturePad } from "@/components/warranty/signature-pad"
import { FileUploadSection } from "./file-upload-section"
import { Loader2, AlertCircle, Check } from "lucide-react"
import type { ErpStore } from "@/lib/erp/types"
import type { ErpSaleItem, ErpSaleItemsResponse } from "@/lib/erp/types"
import { compressImageFile } from "@/lib/client/imageCompression"
import { formatCpfCnpj, formatDateBR, formatPhoneBR, onlyDigits } from "@/lib/format"
import { todayDateOnly } from "@/lib/date"

interface NewTicketFormProps {
  tenant: string
  userStoreId?: string
}

export function NewTicketForm({ tenant, userStoreId }: NewTicketFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [signatureSaved, setSignatureSaved] = useState(false)
  const [files, setFiles] = useState<Array<{ file: File; category: string }>>([])
  const [erpStores, setErpStores] = useState<ErpStore[]>([])
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [storesError, setStoresError] = useState<string | null>(null)
  const [nfeId, setNfeId] = useState("")
  const [erpItems, setErpItems] = useState<ErpSaleItem[]>([])
  const [selectedErpItem, setSelectedErpItem] = useState<ErpSaleItem | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearchingNfe, setIsSearchingNfe] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [submitIssues, setSubmitIssues] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    getValues,
    control,
    setValue,
    setError: setFormError,
    watch,
    formState: { errors },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(CreateTicketFormSchema),
    defaultValues: {
      ticketType: "WARRANTY", // CHG-20250929-06: default ticket type
      erpStoreId: userStoreId || "",
      quantidade: 1,
      isWhatsapp: false,
      dataRecebendoPeca: todayDateOnly(),
    },
    mode: "onBlur",
    shouldUnregister: true,
  })

  const watchIsWhatsapp = Boolean(watch("isWhatsapp")) // CHG-20250929-06: guard optional whatsapp flag
  const watchErpStoreId = watch("erpStoreId")
  const watchTicketType = watch("ticketType")

  useEffect(() => {
    let cancelled = false

    const loadStores = async () => {
      setIsLoadingStores(true)
      setStoresError(null)

      try {
        const response = await fetch("/api/integrations/erp/stores")
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error || "Erro ao carregar lojas do ERP")
        }

        const payload = (await response.json()) as { data?: ErpStore[] }
        if (!cancelled) {
          setErpStores(payload.data || [])
        }
      } catch (err) {
        if (!cancelled) {
          setStoresError(err instanceof Error ? err.message : "Erro ao carregar lojas do ERP")
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStores(false)
        }
      }
    }

    void loadStores()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setErpItems([])
    setSelectedErpItem(null)
    setSearchError(null)
    setSubmitIssues([])
  }, [watchErpStoreId])

  useEffect(() => {
    if (watchTicketType !== "WARRANTY_STORE") return
    setValue("nomeRazaoSocial", undefined) // CHG-20250929-06: clear customer fields for store tickets
    setValue("nomeFantasiaApelido", undefined)
    setValue("cpfCnpj", undefined)
    setValue("celular", undefined)
    setValue("isWhatsapp", false)
  }, [setValue, watchTicketType])

  const buildSubmitIssues = (formErrors?: FieldErrors<CreateTicketFormData>) => {
    const issues = new Set<string>()

    if (!nfeId.trim()) {
      issues.add("Número da NFC-e é obrigatório")
    }

    if (searchError) {
      issues.add(searchError)
    }

    if (erpItems.length === 0) {
      issues.add("Nenhum item da NFC-e carregado")
    }

    if (!selectedErpItem) {
      issues.add("Selecione um item da NFC-e")
    }

    if (formErrors) {
      Object.values(formErrors).forEach((err) => {
        const message = err?.message
        if (message) {
          issues.add(message)
        }
      })
    }

    return Array.from(issues)
  }

  const onSubmit = async (data: CreateTicketFormData) => {
    const clientIssues = buildSubmitIssues()
    if (clientIssues.length > 0) {
      setSubmitIssues(clientIssues)
      return
    }

    if (!signatureDataUrl) {
      setSubmitIssues(["Assinatura é obrigatória"])
      return
    }

    if (files.some((file) => !file.category)) {
      setSubmitIssues(["Selecione a categoria de todos os anexos"])
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSubmitIssues([])

    try {
      const formData = new FormData()

      let optimizedFiles = files
      if (files.some((item) => item.file.type.startsWith("image/"))) {
        setIsOptimizing(true)
        try {
          optimizedFiles = await Promise.all(
            files.map(async (item) => ({
              ...item,
              file: item.file.type.startsWith("image/") ? await compressImageFile(item.file) : item.file,
            })),
          )
          setFiles(optimizedFiles)
        } finally {
          setIsOptimizing(false)
        }
      }

      const isStoreTicket = data.ticketType === "WARRANTY_STORE"
      const customerFields = new Set(["nomeRazaoSocial", "nomeFantasiaApelido", "cpfCnpj", "celular", "isWhatsapp"])
      // Add all form fields
      formData.append("tenantSlug", tenant)
      Object.entries(data).forEach(([key, value]) => {
        if (isStoreTicket && customerFields.has(key)) return // CHG-20250929-06: omit customer fields for store tickets
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value))
        }
      })

      // Add signature
      formData.append("signatureDataUrl", signatureDataUrl)

      // Add file attachments
      optimizedFiles.forEach(({ file, category }) => {
        formData.append("attachments", file)
        formData.append("attachmentCategories", category)
      })

      const response = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        const errorPayload = result?.error
        const message = typeof errorPayload === "string" ? errorPayload : errorPayload?.message
        const field = typeof errorPayload === "object" ? errorPayload?.field : undefined

        if (field && typeof field === "string") {
          setFormError(field as keyof CreateTicketFormData, { message: message || "Campo obrigatório" })
        }

        setSubmitIssues(message ? [message] : ["Erro ao criar ticket"])
        throw new Error(message || "Erro ao criar ticket")
      }

      const result = await response.json()
      router.push(`/t/${tenant}/warranty/${result.ticketId}`)
    } catch (err) {
      console.error("Submit error:", err)
      setError(err instanceof Error ? err.message : "Erro ao criar ticket")
    } finally {
      setIsSubmitting(false)
    }
  }

  const onInvalid = (formErrors: FieldErrors<CreateTicketFormData>) => {
    setSubmitIssues(buildSubmitIssues(formErrors))
  }

  const handleSearchNfe = async () => {
    if (!watchErpStoreId) {
      setSearchError("Selecione a loja antes de buscar a NFC-e")
      return
    }

    const normalizedNfe = onlyDigits(nfeId)
    if (!normalizedNfe) {
      setSearchError("Informe um número de NFC-e válido")
      return
    }

    setIsSearchingNfe(true)
    setError(null)
    setSubmitIssues([])
    setSearchError(null)

    try {
      const response = await fetch(
        `/api/integrations/erp/sales/${normalizedNfe}/items?loja_id=${watchErpStoreId}`,
      )
      const payload = (await response.json().catch(() => null)) as ErpSaleItemsResponse | { error?: string } | null
      if (!response.ok) {
        throw new Error((payload as { error?: string })?.error || "Erro ao buscar itens da NFC-e")
      }

      setErpItems((payload as ErpSaleItemsResponse)?.items || [])
      setIsSearchOpen(true)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Erro ao buscar itens da NFC-e")
    } finally {
      setIsSearchingNfe(false)
    }
  }

  const handleSelectErpItem = (item: ErpSaleItem) => {
    setSelectedErpItem(item)
    setIsSearchOpen(false)
    setError(null)
    setSubmitIssues([])

    setValue("codigo", item.codigoProduto || "", { shouldValidate: true })
    setValue("descricaoPeca", item.descricao || "", { shouldValidate: true })
    setValue("ref", item.referencia || "", { shouldValidate: true })
    setValue("quantidade", item.quantidade ?? 1, { shouldValidate: true })
    if (item.dataEmissao) {
      setValue("dataVenda", item.dataEmissao, { shouldValidate: true })
    }

    const currentSaleNumber = getValues("numeroVendaOuCfe")
    if (!currentSaleNumber && nfeId) {
      setValue("numeroVendaOuCfe", onlyDigits(nfeId), { shouldValidate: true })
    }
  }

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl)
    setSignatureSaved(true)
    setValue("signatureDataUrl", dataUrl)
  }

  const handleSignatureClear = () => {
    setSignatureDataUrl(null)
    setSignatureSaved(false)
    setValue("signatureDataUrl", "")
  }

  const accordionDefaults =
    watchTicketType === "WARRANTY" ? ["cliente", "financeiro", "peca", "obs", "anexos"] : ["financeiro", "peca", "obs", "anexos"] // CHG-20250929-06

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertDescription>
          {watchTicketType === "WARRANTY_STORE" ? (
            <>Ticket interno da loja (sem identificação de cliente). {/* CHG-20250929-06 */}</>
          ) : (
            <>
              Os campos de NF serão preenchidos na etapa <strong>Interno</strong>. No cadastro inicial, informe somente
              os dados do cliente, datas e peça.
            </>
          )}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="ticketType">Tipo de ticket *</Label>
        <Select
          value={watchTicketType || ""}
          onValueChange={(value) => setValue("ticketType", value as CreateTicketFormData["ticketType"], { shouldValidate: true })}
        >
          <SelectTrigger id="ticketType">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WARRANTY">Garantia (com cliente)</SelectItem>
            <SelectItem value="WARRANTY_STORE">Garantia Loja (sem cliente)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isOptimizing && <p className="text-xs text-muted-foreground">Otimizando imagens...</p>}

      <Accordion type="multiple" defaultValue={accordionDefaults} className="space-y-2">
        {/* Cliente Section */}
        {watchTicketType === "WARRANTY" ? (
          <AccordionItem value="cliente" className="border border-border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">Cliente</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeRazaoSocial">Nome / Razão Social *</Label>
                  <Input
                    id="nomeRazaoSocial"
                    {...register("nomeRazaoSocial")}
                    placeholder="Nome completo ou razão social"
                  />
                  {errors.nomeRazaoSocial && (
                    <p className="text-sm text-destructive">{errors.nomeRazaoSocial.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomeFantasiaApelido">Nome Fantasia / Apelido</Label>
                  <Input id="nomeFantasiaApelido" {...register("nomeFantasiaApelido")} placeholder="Opcional" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF / CNPJ *</Label>
                  <Controller
                    control={control}
                    name="cpfCnpj"
                    render={({ field }) => (
                      <Input
                        id="cpfCnpj"
                        value={formatCpfCnpj(field.value || "")}
                        onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 14))}
                        placeholder="000.000.000-00"
                      />
                    )}
                  />
                  {errors.cpfCnpj && <p className="text-sm text-destructive">{errors.cpfCnpj.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="celular">Celular *</Label>
                  <Controller
                    control={control}
                    name="celular"
                    render={({ field }) => (
                      <Input
                        id="celular"
                        value={formatPhoneBR(field.value || "")}
                        onChange={(e) => field.onChange(onlyDigits(e.target.value).slice(0, 11))}
                        placeholder="(00) 00000-0000"
                      />
                    )}
                  />
                  {errors.celular && <p className="text-sm text-destructive">{errors.celular.message}</p>}
                </div>

                <div className="flex items-center gap-3 md:col-span-2">
                  <Switch
                    id="isWhatsapp"
                    checked={watchIsWhatsapp}
                    onCheckedChange={(checked) => setValue("isWhatsapp", checked)}
                  />
                  <Label htmlFor="isWhatsapp">WhatsApp</Label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {/* Data e Logística Section */}
        <AccordionItem value="financeiro" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Data e Logística</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="erpStoreId">Loja *</Label>
                <Select
                  value={watchErpStoreId || ""}
                  onValueChange={(value) => setValue("erpStoreId", value, { shouldValidate: true })}
                  disabled={isLoadingStores || !!storesError}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingStores ? "Carregando lojas..." : "Selecione a loja"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingStores ? (
                      <div className="px-2 py-1 text-sm text-muted-foreground">Carregando...</div>
                    ) : erpStores.length === 0 ? (
                      <div className="px-2 py-1 text-sm text-muted-foreground">Nenhuma loja encontrada.</div>
                    ) : (
                      erpStores.map((store) => (
                        <SelectItem key={store.id} value={String(store.id)}>
                          {store.nomeFantasia}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {storesError && <p className="text-sm text-destructive">{storesError}</p>}
                {errors.erpStoreId && <p className="text-sm text-destructive">{errors.erpStoreId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataRecebendoPeca">Data Recebendo Peça *</Label>
                <Input id="dataRecebendoPeca" type="date" {...register("dataRecebendoPeca")} />
                {errors.dataRecebendoPeca && (
                  <p className="text-sm text-destructive">{errors.dataRecebendoPeca.message}</p>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Peça Section */}
        <AccordionItem value="peca" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Peça</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="nfeId">Número da NFC-e</Label>
                  <Input
                    id="nfeId"
                    value={nfeId}
                    onChange={(event) => {
                      const value = onlyDigits(event.target.value)
                      setNfeId(value)
                      setSelectedErpItem(null)
                    }}
                    placeholder="Ex: 27207"
                    inputMode="numeric"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSearchNfe}
                  disabled={isSearchingNfe}
                  className="w-full md:w-auto"
                >
                  {isSearchingNfe ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando NFC-e...
                    </>
                  ) : (
                    "Buscar NFC-e"
                  )}
                </Button>
              </div>

              {searchError && <p className="text-sm text-destructive">{searchError}</p>}

              {selectedErpItem && (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                  Item selecionado:{" "}
                  <span className="font-medium">{selectedErpItem.descricao || "Descrição não informada"}</span>
                  {selectedErpItem.codigoProduto ? ` • Código ${selectedErpItem.codigoProduto}` : ""}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricaoPeca">Descrição da Peça *</Label>
                <Textarea id="descricaoPeca" {...register("descricaoPeca")} placeholder="Descreva a peça" rows={2} />
                {errors.descricaoPeca && <p className="text-sm text-destructive">{errors.descricaoPeca.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input id="quantidade" type="number" min={1} {...register("quantidade", { valueAsNumber: true })} />
                {errors.quantidade && <p className="text-sm text-destructive">{errors.quantidade.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ref">Referência</Label>
                <Input id="ref" {...register("ref")} placeholder="Ref" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" {...register("codigo")} placeholder="Código" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="defeitoPeca">Defeito *</Label>
                <Textarea id="defeitoPeca" {...register("defeitoPeca")} placeholder="Descreva o defeito" rows={2} />
                {errors.defeitoPeca && <p className="text-sm text-destructive">{errors.defeitoPeca.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroVendaOuCfe">Nº Venda / CFe *</Label>
                <Input id="numeroVendaOuCfe" {...register("numeroVendaOuCfe")} placeholder="Número" />
                {errors.numeroVendaOuCfe && (
                  <p className="text-sm text-destructive">{errors.numeroVendaOuCfe.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataVenda">Data da Venda *</Label>
                <Input id="dataVenda" type="date" {...register("dataVenda")} />
                {errors.dataVenda && <p className="text-sm text-destructive">{errors.dataVenda.message}</p>}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Observações Section */}
        <AccordionItem value="obs" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Observações</span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <div className="space-y-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea id="obs" {...register("obs")} placeholder="Observações adicionais" rows={3} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Anexos & Assinatura Section */}
        <AccordionItem value="anexos" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Anexos e Assinatura</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            {/* Signature */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Assinatura do Cliente *</Label>
                {signatureSaved && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Salva
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" onClick={() => setShowSignatureDialog(true)} disabled={isSubmitting}>
                  {signatureSaved ? "Refazer assinatura" : "Capturar assinatura"}
                </Button>
                {signatureSaved && (
                  <Button type="button" variant="ghost" onClick={handleSignatureClear} disabled={isSubmitting}>
                    Limpar assinatura
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Abra a assinatura em tela quase inteira para facilitar no celular (gire o aparelho se precisar).
                </p>
              </div>
              {errors.signatureDataUrl && <p className="text-sm text-destructive">{errors.signatureDataUrl.message}</p>}
            </div>

            {/* File attachments */}
            <div className="space-y-2">
              <Label>Anexos</Label>
              <FileUploadSection files={files} onFilesChange={setFiles} disabled={isSubmitting} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Itens da NFC-e</DialogTitle>
            <DialogDescription>Selecione o item para preencher os dados da peça.</DialogDescription>
          </DialogHeader>

          {erpItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-2">
              <div className="space-y-2">
                {erpItems.map((item, index) => {
                  const key = `${item.produtoId ?? "item"}-${item.codigoProduto ?? "codigo"}-${item.referencia ?? "ref"}-${index}`

                  return (
                    <div key={key} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <p className="font-medium">{item.descricao || "Item sem descrição"}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.codigoProduto ? `Código ${item.codigoProduto}` : "Código não informado"}
                          {item.referencia ? ` • Ref ${item.referencia}` : ""}
                          {typeof item.quantidade === "number" ? ` • Qtde ${item.quantidade}` : ""}
                          {item.marca ? ` • ${item.marca}` : ""}
                          {item.dataEmissao ? ` • Emissão ${formatDateBR(item.dataEmissao)}` : ""}
                        </p>
                      </div>
                      <Button type="button" size="sm" onClick={() => handleSelectErpItem(item)}>
                        Selecionar
                      </Button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
        <DialogContent className="flex h-[90vh] max-w-[95vw] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Assinatura do cliente</DialogTitle>
            <DialogDescription>Assine no espaço abaixo. Você pode girar o celular para ter mais área.</DialogDescription>
          </DialogHeader>
          <div className="flex-1">
            <SignaturePad
              onSave={(dataUrl) => {
                handleSignatureSave(dataUrl)
                setShowSignatureDialog(false)
              }}
              onClear={handleSignatureClear}
              disabled={isSubmitting}
              width={900}
              height={500}
              maxExportWidth={900}
              maxExportHeight={400}
              className="h-[60vh]"
              canvasClassName="h-full"
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setShowSignatureDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {submitIssues.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Pendências para criar o ticket:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {submitIssues.map((issue, index) => (
              <li key={`${issue}-${index}`}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting || isOptimizing}
          className="flex-1 md:flex-none"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isOptimizing || !selectedErpItem}
          className="flex-1 md:flex-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando...
            </>
          ) : (
            "Criar Ticket"
          )}
        </Button>
      </div>
    </form>
  )
}
