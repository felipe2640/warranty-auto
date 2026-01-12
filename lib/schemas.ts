import { z } from "zod"
import { RoleEnum, type Role } from "./roles"
import { onlyDigits } from "./format"
import { isDateOnlyString, toDateOnlyString } from "./date"
import { isValidCell, isValidCpfCnpj, normalizeDigits } from "./validation"

export { RoleEnum }
export type { Role }

// Status (workflow stages)
export const StatusEnum = z.enum([
  "RECEBIMENTO",
  "INTERNO",
  "ENTREGA_LOGISTICA",
  "COBRANCA_ACOMPANHAMENTO",
  "RESOLUCAO",
  "ENCERRADO",
])
export type Status = z.infer<typeof StatusEnum>

// Status order for workflow
export const STATUS_ORDER: Status[] = [
  "RECEBIMENTO",
  "INTERNO",
  "ENTREGA_LOGISTICA",
  "COBRANCA_ACOMPANHAMENTO",
  "RESOLUCAO",
  "ENCERRADO",
]

// Timeline entry types
export const TimelineTypeEnum = z.enum(["OBS", "LIGACAO", "EMAIL", "PRAZO", "STATUS_CHANGE", "DOCUMENTO"])
export type TimelineType = z.infer<typeof TimelineTypeEnum>

export const TimelineNextActionRequiredTypes = ["PRAZO", "LIGACAO", "EMAIL"] as const
export type TimelineNextActionRequiredType = (typeof TimelineNextActionRequiredTypes)[number]

const dateOnlySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined
  if (value instanceof Date) return toDateOnlyString(value)
  if (typeof value === "string") return toDateOnlyString(value)
  return value
}, z.string().refine((value) => isDateOnlyString(value), "Data inválida"))

const requiredDateOnlySchema = (message: string) =>
  z.preprocess((value) => {
    if (value === undefined || value === null || value === "") return ""
    if (value instanceof Date) return toDateOnlyString(value)
    if (typeof value === "string") return toDateOnlyString(value)
    return value
  }, z.string().min(1, message).refine((value) => isDateOnlyString(value), "Data inválida"))

// Attachment categories
export const AttachmentCategoryEnum = z.enum([
  "FOTO_PECA",
  "CUPOM_FISCAL",
  "CERTIFICADO_GARANTIA",
  "NOTA_GARANTIA",
  "CANHOTO",
  "OUTRO",
  "ASSINATURA",
])
export type AttachmentCategory = z.infer<typeof AttachmentCategoryEnum>

export const ResolutionResultEnum = z.enum(["CREDITO", "TROCA", "NEGOU"])
export type ResolutionResult = z.infer<typeof ResolutionResultEnum>

// User schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  role: RoleEnum,
  tenantId: z.string(),
  storeId: z.string().optional(),
  active: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type User = z.infer<typeof UserSchema>

// Store schema
export const StoreSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  cnpj: z
    .string()
    .optional()
    .transform((value) => (value ? onlyDigits(value).slice(0, 14) : value)),
  address: z.string().optional(),
  phone: z
    .string()
    .optional()
    .transform((value) => (value ? onlyDigits(value).slice(0, 11) : value)),
  tenantId: z.string(),
  active: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Store = z.infer<typeof StoreSchema>

// Supplier schema
export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slaDays: z.number().int().min(1),
  cnpj: z
    .string()
    .optional()
    .transform((value) => (value ? onlyDigits(value).slice(0, 14) : value)),
  phone: z
    .string()
    .optional()
    .transform((value) => (value ? onlyDigits(value).slice(0, 11) : value)),
  email: z.string().email().optional(),
  tenantId: z.string(),
  active: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Supplier = z.infer<typeof SupplierSchema>

// Tenant settings schema
export const TenantSettingsSchema = z.object({
  id: z.string(),
  slug: z.string().min(1),
  name: z.string().min(1),
  driveRootFolderId: z.string().optional(),
  serviceAccountEmail: z.string().optional(),
  policies: z.object({
    recebedorOnlyOwnStore: z.boolean().default(true),
    requireCanhotForCobranca: z.boolean().default(true),
    allowCloseWithoutResolution: z.boolean().default(false),
    defaultSlaDays: z.number().int().min(1).optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type TenantSettings = z.infer<typeof TenantSettingsSchema>

// Timeline entry schema
export const TimelineEntrySchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  type: TimelineTypeEnum,
  text: z.string(),
  userId: z.string(),
  userName: z.string(),
  nextActionAt: dateOnlySchema.optional(),
  nextActionNote: z.string().optional(),
  createdAt: z.date(),
})
export type TimelineEntry = z.infer<typeof TimelineEntrySchema>

// Attachment schema
export const AttachmentSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  category: AttachmentCategoryEnum,
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  driveFileId: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.date(),
})
export type Attachment = z.infer<typeof AttachmentSchema>

// Audit entry schema
export const AuditEntrySchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  action: z.string(),
  fromStatus: StatusEnum.optional(),
  toStatus: StatusEnum.optional(),
  userId: z.string(),
  userName: z.string(),
  reason: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
})
export type AuditEntry = z.infer<typeof AuditEntrySchema>

// Ticket schema
export const TicketSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  storeId: z.string(),
  status: StatusEnum,

  // Cliente
  nfIda: z.string().optional(),
  nfRetorno: z.string().optional(),
  boletoComAbatimento: z.string().optional(),
  remessa: z.string().optional(),
  retorno: z.string().optional(),
  nomeRazaoSocial: z.string().min(1),
  nomeFantasiaApelido: z.string().optional(),
  cpfCnpj: z.string().min(1),
  celular: z.string().min(1),
  isWhatsapp: z.boolean().default(false),

  // Peça
  descricaoPeca: z.string().min(1),
  quantidade: z.number().int().min(1),
  ref: z.string().optional(),
  codigo: z.string().optional(),
  defeitoPeca: z.string().min(1),
  numeroVendaOuCfe: z.string().min(1),
  numeroVendaOuCfeFornecedor: z.string().optional(),
  dataVenda: dateOnlySchema,
  dataRecebendoPeca: dateOnlySchema,
  dataIndoFornecedor: dateOnlySchema.optional(),
  obs: z.string().optional(),

  // Workflow
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  slaDays: z.number().int().optional(),
  dueDate: dateOnlySchema.optional(),
  nextActionAt: dateOnlySchema.optional(),
  nextActionNote: z.string().optional(),
  deliveredToSupplierAt: z.date().optional(),
  supplierResponse: z.string().optional(),

  // Resolution
  resolutionResult: ResolutionResultEnum.optional(),
  resolutionNotes: z.string().optional(),
  closedAt: z.date().optional(),

  // Search
  searchTokens: z.array(z.string()).optional(),
  isClosed: z.boolean().default(false),

  // Drive
  driveFolderId: z.string().optional(),

  // Metadata
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Stage completion tracking
  stageHistory: z
    .array(
      z.object({
        status: StatusEnum,
        completedAt: z.date(),
        completedBy: z.string(),
        completedByName: z.string(),
      }),
    )
    .optional(),
})
export type Ticket = z.infer<typeof TicketSchema>

// Form schemas for validation
export const CreateTicketFormSchema = z.object({
  // Cliente
  nfIda: z.string().optional(),
  nfRetorno: z.string().optional(),
  boletoComAbatimento: z.string().optional(),
  remessa: z.string().optional(),
  retorno: z.string().optional(),
  nomeRazaoSocial: z.string().min(1, "Nome/Razão Social é obrigatório"),
  nomeFantasiaApelido: z.string().optional(),
  cpfCnpj: z
    .string()
    .min(1, "CPF/CNPJ é obrigatório")
    .refine((value) => isValidCpfCnpj(value), "CPF/CNPJ deve ter 11 ou 14 dígitos"),
  celular: z
    .string()
    .min(1, "Celular é obrigatório")
    .refine((value) => isValidCell(value), "Celular deve ter ao menos 10 dígitos"),
  isWhatsapp: z.boolean().default(false),

  // Peça
  descricaoPeca: z.string().min(1, "Descrição da peça é obrigatória"),
  quantidade: z.number().int().min(1, "Quantidade mínima é 1"),
  ref: z.string().optional(),
  codigo: z.string().optional(),
  defeitoPeca: z.string().min(1, "Defeito é obrigatório"),
  numeroVendaOuCfe: z.string().min(1, "Número da venda/CFe é obrigatório"),
  numeroVendaOuCfeFornecedor: z.string().optional(),
  dataVenda: requiredDateOnlySchema("Data da venda é obrigatória"),
  dataRecebendoPeca: requiredDateOnlySchema("Data de recebimento é obrigatória"),
  dataIndoFornecedor: dateOnlySchema.optional(),
  obs: z.string().optional(),

  // Store
  storeId: z.string().min(1, "Loja é obrigatória"),

  // Signature
  signatureDataUrl: z.string().min(1, "Assinatura é obrigatória"),
})
export type CreateTicketFormData = z.infer<typeof CreateTicketFormSchema>

export const CreateTicketInputSchema = z.object({
  tenantId: z.string().min(1),
  storeId: z.string().min(1),
  nfIda: z.string().optional(),
  nfRetorno: z.string().optional(),
  boletoComAbatimento: z.string().optional(),
  remessa: z.string().optional(),
  retorno: z.string().optional(),
  nomeRazaoSocial: z.string().min(1),
  nomeFantasiaApelido: z.string().optional(),
  cpfCnpj: z
    .string()
    .min(1)
    .transform((value) => onlyDigits(value).slice(0, 14))
    .refine((value) => isValidCpfCnpj(value), "CPF/CNPJ deve ter 11 ou 14 dígitos"),
  celular: z
    .string()
    .min(1)
    .transform((value) => onlyDigits(value).slice(0, 11))
    .refine((value) => isValidCell(value), "Celular deve ter ao menos 10 dígitos"),
  isWhatsapp: z.boolean().default(false),
  descricaoPeca: z.string().min(1),
  quantidade: z.number().int().min(1),
  ref: z.string().optional(),
  codigo: z.string().optional(),
  defeitoPeca: z.string().min(1),
  numeroVendaOuCfe: z.string().min(1),
  numeroVendaOuCfeFornecedor: z.string().optional(),
  dataVenda: dateOnlySchema,
  dataRecebendoPeca: dateOnlySchema,
  dataIndoFornecedor: dateOnlySchema.optional(),
  obs: z.string().optional(),
  createdBy: z.string().min(1),
  signatureDataUrl: z.string().min(1),
})

const optionalTrimmedString = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}, z.string().optional())

const requiredTrimmedString = z.preprocess((value) => {
  if (value === undefined || value === null) return value
  if (typeof value !== "string") return value
  return value.trim()
}, z.string().min(1))

export const UpdateTicketDetailsSchema = z.object({
  // Cliente
  nomeRazaoSocial: requiredTrimmedString.optional(),
  nomeFantasiaApelido: optionalTrimmedString,
  cpfCnpj: z
    .string()
    .min(1)
    .transform((value) => onlyDigits(value).slice(0, 14))
    .refine((value) => isValidCpfCnpj(value), "CPF/CNPJ deve ter 11 ou 14 dígitos")
    .optional(),
  celular: z
    .string()
    .min(1)
    .transform((value) => onlyDigits(value).slice(0, 11))
    .refine((value) => isValidCell(value), "Celular deve ter ao menos 10 dígitos")
    .optional(),
  isWhatsapp: z.boolean().optional(),

  // Peça
  descricaoPeca: requiredTrimmedString.optional(),
  quantidade: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === "") return undefined
      if (typeof value === "string") return Number(value)
      return value
    }, z.number().int().min(1))
    .optional(),
  ref: optionalTrimmedString,
  codigo: optionalTrimmedString,
  defeitoPeca: requiredTrimmedString.optional(),
  numeroVendaOuCfe: requiredTrimmedString.optional(),
  numeroVendaOuCfeFornecedor: optionalTrimmedString,
  obs: optionalTrimmedString,

  // Loja & Fornecedor
  storeId: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional(),
})
export type UpdateTicketDetailsInput = z.infer<typeof UpdateTicketDetailsSchema>

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: RoleEnum,
  storeId: z.string().optional().nullable(),
})

export const storeSchema = StoreSchema
export const supplierSchema = SupplierSchema

export function normalizeCpfCnpj(value: string) {
  return normalizeDigits(value)
}

export function normalizeCell(value: string) {
  return normalizeDigits(value)
}

// Login schema
export const LoginFormSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
})
export type LoginFormData = z.infer<typeof LoginFormSchema>

// Timeline form schema
export const TimelineFormSchema = z
  .object({
    type: TimelineTypeEnum,
    text: z.string().min(1, "Texto é obrigatório"),
    setNextAction: z.boolean().default(false),
    nextActionAt: dateOnlySchema.optional(),
    nextActionNote: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const requiresNextAction = TimelineNextActionRequiredTypes.includes(data.type as TimelineNextActionRequiredType)
    if (requiresNextAction && !data.nextActionAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nextActionAt"],
        message: "Data da próxima ação é obrigatória",
      })
    }

    if (data.setNextAction && !data.nextActionAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nextActionAt"],
        message: "Data da próxima ação é obrigatória",
      })
    }
  })
export type TimelineFormData = z.infer<typeof TimelineFormSchema>
