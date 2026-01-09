"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
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
import { SignaturePad } from "@/components/warranty/signature-pad"
import { FileUploadSection } from "./file-upload-section"
import { Loader2, AlertCircle, Check } from "lucide-react"
import type { Store } from "@/lib/schemas"

interface NewTicketFormProps {
  tenant: string
  stores: Store[]
  userStoreId?: string
}

export function NewTicketForm({ tenant, stores, userStoreId }: NewTicketFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [signatureSaved, setSignatureSaved] = useState(false)
  const [files, setFiles] = useState<Array<{ file: File; category: string }>>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(CreateTicketFormSchema),
    defaultValues: {
      storeId: userStoreId || "",
      quantidade: 1,
      isWhatsapp: false,
    },
    mode: "onBlur",
  })

  const watchIsWhatsapp = watch("isWhatsapp")

  const onSubmit = async (data: CreateTicketFormData) => {
    if (!signatureDataUrl) {
      setError("Assinatura é obrigatória")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()

      // Add all form fields
      formData.append("tenantSlug", tenant)
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value))
        }
      })

      // Add signature
      formData.append("signatureDataUrl", signatureDataUrl)

      // Add file attachments
      files.forEach(({ file, category }) => {
        formData.append("attachments", file)
        formData.append("attachmentCategories", category)
      })

      const response = await fetch("/api/tickets", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Erro ao criar ticket")
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Accordion
        type="multiple"
        defaultValue={["cliente", "peca", "financeiro", "obs", "anexos"]}
        className="space-y-2"
      >
        {/* Cliente Section */}
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
                {errors.nomeRazaoSocial && <p className="text-sm text-destructive">{errors.nomeRazaoSocial.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nomeFantasiaApelido">Nome Fantasia / Apelido</Label>
                <Input id="nomeFantasiaApelido" {...register("nomeFantasiaApelido")} placeholder="Opcional" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpfCnpj">CPF / CNPJ *</Label>
                <Input id="cpfCnpj" {...register("cpfCnpj")} placeholder="000.000.000-00" />
                {errors.cpfCnpj && <p className="text-sm text-destructive">{errors.cpfCnpj.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="celular">Celular *</Label>
                <Input id="celular" {...register("celular")} placeholder="(00) 00000-0000" />
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="nfIda">NF Ida</Label>
                <Input id="nfIda" {...register("nfIda")} placeholder="Número" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nfRetorno">NF Retorno</Label>
                <Input id="nfRetorno" {...register("nfRetorno")} placeholder="Número" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="boletoComAbatimento">Boleto c/ Abatimento</Label>
                <Input id="boletoComAbatimento" {...register("boletoComAbatimento")} placeholder="Valor" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remessa">Remessa</Label>
                <Input id="remessa" {...register("remessa")} placeholder="Código" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="retorno">Retorno</Label>
                <Input id="retorno" {...register("retorno")} placeholder="Código" />
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
                <Label htmlFor="numeroVendaOuCfeFornecedor">Nº Venda/CFe Fornecedor</Label>
                <Input
                  id="numeroVendaOuCfeFornecedor"
                  {...register("numeroVendaOuCfeFornecedor")}
                  placeholder="Opcional"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Financeiro/Logística Section */}
        <AccordionItem value="financeiro" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="font-semibold">Datas e Logística</span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="storeId">Loja *</Label>
                <Select defaultValue={userStoreId} onValueChange={(value) => setValue("storeId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.storeId && <p className="text-sm text-destructive">{errors.storeId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataVenda">Data da Venda *</Label>
                <Input id="dataVenda" type="date" {...register("dataVenda")} />
                {errors.dataVenda && <p className="text-sm text-destructive">{errors.dataVenda.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataRecebendoPeca">Data Recebendo Peça *</Label>
                <Input id="dataRecebendoPeca" type="date" {...register("dataRecebendoPeca")} />
                {errors.dataRecebendoPeca && (
                  <p className="text-sm text-destructive">{errors.dataRecebendoPeca.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataIndoFornecedor">Data Indo Fornecedor</Label>
                <Input id="dataIndoFornecedor" type="date" {...register("dataIndoFornecedor")} />
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
              <SignaturePad onSave={handleSignatureSave} onClear={handleSignatureClear} disabled={isSubmitting} />
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

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex-1 md:flex-none"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1 md:flex-none">
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
