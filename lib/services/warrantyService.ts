import { computeDueDate } from "@/lib/domain/warranty/sla"
import { validateTransition } from "@/lib/domain/warranty/statusMachine"
import { getStoreById, getSupplierById, getTenantSettings, listStores, listSuppliers } from "@/lib/repositories/admin"
import {
  addAttachment,
  addTicketAuditEntry,
  addTimelineEntry,
  createTicket,
  getDashboardCounts,
  getTicketAttachments,
  getTicketAudit,
  getTicketById,
  getTicketTimeline,
  hasAttachmentOfCategory,
  listTickets,
  listTicketsByNextActionRange,
  updateTicketEditableFields,
  updateTicketStatus,
  revertTicketStatus,
} from "@/lib/repositories/tickets"
import { buildSearchTokens } from "@/lib/search"
import { DEFAULT_TIMEZONE, addDaysDateOnly, toDateOnlyString, todayDateOnly } from "@/lib/date"
import type { Role } from "@/lib/roles"
import {
  AttachmentCategoryEnum,
  CreateTicketInputSchema,
  ResolutionResultEnum,
  UpdateTicketDetailsSchema,
  normalizeCell,
  normalizeCpfCnpj,
  type UpdateTicketDetailsInput,
  type Attachment,
  type Status,
  type Ticket,
  type TimelineEntry,
} from "@/lib/schemas"
import type { NextTransitionChecklist, StageSummary, TransitionChecklistItem } from "@/lib/types/warranty"
import { diffEditableFields } from "@/lib/domain/warranty/diff"

const AGENDA_STATUSES: Status[] = ["COBRANCA_ACOMPANHAMENTO", "ENTREGA_LOGISTICA", "RESOLUCAO"]
const MAX_CALENDAR_TICKETS = 500

const CUSTOMER_FIELDS = [
  "nomeRazaoSocial",
  "nomeFantasiaApelido",
  "cpfCnpj",
  "celular",
  "isWhatsapp",
] as const
const PART_FIELDS = [
  "descricaoPeca",
  "quantidade",
  "ref",
  "codigo",
  "defeitoPeca",
  "numeroVendaOuCfe",
  "numeroVendaOuCfeFornecedor",
  "obs",
] as const
const STORE_FIELDS = ["storeId"] as const
const SUPPLIER_FIELDS = ["supplierId"] as const

const EDIT_FIELD_LABELS: Record<string, string> = {
  nomeRazaoSocial: "Nome/Razão Social",
  nomeFantasiaApelido: "Nome Fantasia/Apelido",
  cpfCnpj: "CPF/CNPJ",
  celular: "Celular",
  isWhatsapp: "WhatsApp",
  descricaoPeca: "Descrição da peça",
  quantidade: "Quantidade",
  ref: "Referência",
  codigo: "Código",
  defeitoPeca: "Defeito",
  numeroVendaOuCfe: "Número da venda/CFe",
  numeroVendaOuCfeFornecedor: "Número fornecedor",
  obs: "Observações",
  storeId: "Loja",
  supplierId: "Fornecedor",
}

function buildTransitionChecklist(options: {
  ticket: Ticket
  role: Role
  hasCanhoto: boolean
}): NextTransitionChecklist {
  const nextStatusMap: Record<Status, Status | null> = {
    RECEBIMENTO: "INTERNO",
    INTERNO: "ENTREGA_LOGISTICA",
    ENTREGA_LOGISTICA: "COBRANCA_ACOMPANHAMENTO",
    COBRANCA_ACOMPANHAMENTO: "RESOLUCAO",
    RESOLUCAO: "ENCERRADO",
    ENCERRADO: null,
  }

  const nextStatus = nextStatusMap[options.ticket.status]

  const items: TransitionChecklistItem[] = []

  if (options.ticket.status === "INTERNO") {
    const satisfied = !!options.ticket.supplierId
    items.push({
      key: "supplierId",
      label: "Fornecedor definido",
      satisfied,
      cta: satisfied ? undefined : { type: "supplier", label: "Definir fornecedor" },
    })
  }

  if (options.ticket.status === "ENTREGA_LOGISTICA") {
    items.push({
      key: "canhoto",
      label: "Anexo CANHOTO",
      satisfied: options.hasCanhoto,
      cta: options.hasCanhoto ? undefined : { type: "attachment", label: "Anexar canhoto" },
    })
  }

  if (options.ticket.status === "COBRANCA_ACOMPANHAMENTO") {
    const satisfied = !!options.ticket.supplierResponse
    items.push({
      key: "supplierResponse",
      label: "Resposta do fornecedor",
      satisfied,
      cta: satisfied ? undefined : { type: "supplierResponse", label: "Registrar resposta" },
    })
  }

  if (options.ticket.status === "RESOLUCAO") {
    const resolutionValidation = ResolutionResultEnum.safeParse(options.ticket.resolutionResult)
    const satisfied = resolutionValidation.success
    items.push({
      key: "resolutionResult",
      label: "Resultado final (Crédito/Troca/Negou)",
      satisfied,
      cta: satisfied ? undefined : { type: "resolution", label: "Registrar resultado final" },
    })
  }

  const transitionError = validateTransition(
    options.ticket,
    { role: options.role },
    {
      supplierId: options.ticket.supplierId,
      resolutionResult: options.ticket.resolutionResult,
      supplierResponse: options.ticket.supplierResponse,
    },
    { hasCanhoto: options.hasCanhoto },
  )

  return {
    nextStatus,
    canAdvance: !transitionError,
    items,
  }
}

function buildStageSummaryMap(
  ticket: Ticket,
  timeline: TimelineEntry[],
  attachments: Attachment[],
): Record<Status, StageSummary> {
  const stageHistory = ticket.stageHistory || []
  const summaryMap: Record<Status, StageSummary> = {
    RECEBIMENTO: { status: "RECEBIMENTO", attachmentsPreview: [] },
    INTERNO: { status: "INTERNO", attachmentsPreview: [] },
    ENTREGA_LOGISTICA: { status: "ENTREGA_LOGISTICA", attachmentsPreview: [] },
    COBRANCA_ACOMPANHAMENTO: { status: "COBRANCA_ACOMPANHAMENTO", attachmentsPreview: [] },
    RESOLUCAO: { status: "RESOLUCAO", attachmentsPreview: [] },
    ENCERRADO: { status: "ENCERRADO", attachmentsPreview: [] },
  }

  const sortedHistory = [...stageHistory].sort((a, b) => (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0))

  sortedHistory.forEach((stage, index) => {
    const previous = sortedHistory[index - 1]
    const start = previous?.completedAt ? new Date(previous.completedAt) : undefined
    const end = stage.completedAt ? new Date(stage.completedAt) : undefined

    const relatedAttachments = attachments.filter((attachment) => {
      if (!attachment.uploadedAt || !end) return false
      const uploadedAt = new Date(attachment.uploadedAt)
      if (start && uploadedAt <= start) return false
      return uploadedAt <= end
    })

    const lastNote = timeline
      .filter((entry) => {
        if (!entry.createdAt || !end) return false
        return new Date(entry.createdAt) <= end
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.text

    summaryMap[stage.status] = {
      status: stage.status,
      at: stage.completedAt,
      byName: stage.completedByName,
      lastNote,
      attachmentsPreview: relatedAttachments.slice(0, 3).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        category: attachment.category,
        driveFileId: attachment.driveFileId,
        uploadedAt: attachment.uploadedAt,
      })),
    }
  })

  return summaryMap
}

function getAllowedEditFields(role: Role, allowStoreChange: boolean) {
  const fields = new Set<string>()

  if (role === "ADMIN") {
    CUSTOMER_FIELDS.forEach((field) => fields.add(field))
    PART_FIELDS.forEach((field) => fields.add(field))
    STORE_FIELDS.forEach((field) => fields.add(field))
    SUPPLIER_FIELDS.forEach((field) => fields.add(field))
    return fields
  }

  if (role === "INTERNO") {
    PART_FIELDS.forEach((field) => fields.add(field))
    SUPPLIER_FIELDS.forEach((field) => fields.add(field))
    if (allowStoreChange) {
      STORE_FIELDS.forEach((field) => fields.add(field))
    }
    return fields
  }

  if (role === "RECEBEDOR") {
    CUSTOMER_FIELDS.forEach((field) => fields.add(field))
    PART_FIELDS.forEach((field) => fields.add(field))
    return fields
  }

  return fields
}

export async function fetchDashboardData(options: { tenantId: string; storeId?: string }) {
  const counts = await getDashboardCounts(options.tenantId, options.storeId)

  const todayTickets = await listTickets({
    tenantId: options.tenantId,
    storeId: options.storeId,
    onlyActionToday: true,
    limit: 10,
  })

  const overdueTickets = await listTickets({
    tenantId: options.tenantId,
    storeId: options.storeId,
    onlyOverdue: true,
    limit: 10,
  })

  return {
    counts,
    todayTickets: todayTickets.tickets,
    overdueTickets: overdueTickets.tickets,
  }
}

export async function createTicketWithUploads(options: {
  tenantId: string
  session: { uid: string; name: string; role: Role }
  formData: FormData
}) {
  const tenantSettings = await getTenantSettings(options.tenantId)

  if (!tenantSettings?.driveRootFolderId) {
    return { error: "Drive folder not configured", status: 400 }
  }

  const signatureDataUrl = options.formData.get("signatureDataUrl") as string
  if (!signatureDataUrl) {
    return { error: "Assinatura é obrigatória", status: 400 }
  }

  const ticketInput = CreateTicketInputSchema.safeParse({
    tenantId: options.tenantId,
    storeId: options.formData.get("storeId") as string,
    nfIda: (options.formData.get("nfIda") as string) || undefined,
    nfRetorno: (options.formData.get("nfRetorno") as string) || undefined,
    boletoComAbatimento: (options.formData.get("boletoComAbatimento") as string) || undefined,
    remessa: (options.formData.get("remessa") as string) || undefined,
    retorno: (options.formData.get("retorno") as string) || undefined,
    nomeRazaoSocial: options.formData.get("nomeRazaoSocial") as string,
    nomeFantasiaApelido: (options.formData.get("nomeFantasiaApelido") as string) || undefined,
    cpfCnpj: normalizeCpfCnpj((options.formData.get("cpfCnpj") as string) || ""),
    celular: normalizeCell((options.formData.get("celular") as string) || ""),
    isWhatsapp: options.formData.get("isWhatsapp") === "true",
    descricaoPeca: options.formData.get("descricaoPeca") as string,
    quantidade: Number.parseInt(options.formData.get("quantidade") as string, 10),
    ref: (options.formData.get("ref") as string) || undefined,
    codigo: (options.formData.get("codigo") as string) || undefined,
    defeitoPeca: options.formData.get("defeitoPeca") as string,
    numeroVendaOuCfe: options.formData.get("numeroVendaOuCfe") as string,
    numeroVendaOuCfeFornecedor: (options.formData.get("numeroVendaOuCfeFornecedor") as string) || undefined,
    dataVenda: toDateOnlyString(options.formData.get("dataVenda") as string),
    dataRecebendoPeca: toDateOnlyString(options.formData.get("dataRecebendoPeca") as string),
    dataIndoFornecedor: options.formData.get("dataIndoFornecedor")
      ? toDateOnlyString(options.formData.get("dataIndoFornecedor") as string)
      : undefined,
    obs: (options.formData.get("obs") as string) || undefined,
    createdBy: options.session.uid,
    signatureDataUrl,
  })

  if (!ticketInput.success) {
    return { error: ticketInput.error.errors[0].message, status: 400 }
  }

  const { signatureDataUrl: signatureValue, ...ticketData } = ticketInput.data
  const ticketId = await createTicket(ticketData, tenantSettings.driveRootFolderId, options.session.uid, options.session.name)

  const base64Data = signatureValue.replace(/^data:image\/png;base64,/, "")
  const signatureBuffer = Buffer.from(base64Data, "base64")

  await addAttachment(ticketId, signatureBuffer, {
    name: `assinatura_${ticketId}.png`,
    mimeType: "image/png",
    size: signatureBuffer.length,
    category: "ASSINATURA",
    uploadedBy: options.session.uid,
    uploadedByName: options.session.name,
  })

  const attachmentEntries = options.formData.getAll("attachments")
  const categoryEntries = options.formData.getAll("attachmentCategories")

  if (attachmentEntries.length !== categoryEntries.length) {
    return { error: "Categorias de anexos inválidas", status: 400 }
  }

  for (let i = 0; i < attachmentEntries.length; i++) {
    const file = attachmentEntries[i] as File
    const category = categoryEntries[i] as string

    if (!category) {
      return { error: "Categoria do anexo é obrigatória", status: 400 }
    }

    const categoryValidation = AttachmentCategoryEnum.safeParse(category)
    if (!categoryValidation.success || category === "ASSINATURA") {
      return { error: "Categoria do anexo inválida", status: 400 }
    }

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer())

      await addAttachment(ticketId, buffer, {
        name: file.name,
        mimeType: file.type,
        size: file.size,
        category,
        uploadedBy: options.session.uid,
        uploadedByName: options.session.name,
      })
    }
  }

  return { ticketId, status: 200 }
}

export async function fetchTicketDetail(options: {
  tenantId: string
  ticketId: string
  canSeeAudit: boolean
  role: Role
}) {
  const ticket = await getTicketById(options.ticketId)
  if (!ticket || ticket.tenantId !== options.tenantId) {
    return null
  }

  const [timeline, attachments, stores, suppliers, audit, hasCanhoto, tenantSettings] = await Promise.all([
    getTicketTimeline(options.ticketId),
    getTicketAttachments(options.ticketId),
    listStores(options.tenantId),
    listSuppliers(options.tenantId),
    options.canSeeAudit ? getTicketAudit(options.ticketId) : Promise.resolve([]),
    hasAttachmentOfCategory(options.ticketId, "CANHOTO"),
    getTenantSettings(options.tenantId),
  ])

  const store = stores.find((s) => s.id === ticket.storeId)
  const supplier = ticket.supplierId ? suppliers.find((s) => s.id === ticket.supplierId) : null

  const nextTransitionChecklist = buildTransitionChecklist({
    ticket,
    role: options.role,
    hasCanhoto,
  })

  const stageSummaryMap = buildStageSummaryMap(ticket, timeline, attachments)

  return {
    ticket: {
      ...ticket,
      storeName: store?.name || "—",
      supplierName: supplier?.name || ticket.supplierName || "—",
    },
    timeline,
    attachments,
    audit,
    suppliers: suppliers.filter((s) => s.active),
    stores,
    tenantSettings,
    nextTransitionChecklist,
    stageSummaryMap,
  }
}

export async function updateTicketDetails(options: {
  tenantId: string
  ticketId: string
  userId: string
  userName: string
  userEmail?: string
  role: Role
  userStoreId?: string | null
  payload: unknown
}) {
  const ticket = await getTicketById(options.ticketId)
  if (!ticket) {
    return { error: { message: "Ticket not found" }, status: 404 }
  }

  if (ticket.tenantId !== options.tenantId) {
    return { error: { message: "Access denied" }, status: 403 }
  }

  const validation = UpdateTicketDetailsSchema.safeParse(options.payload)
  if (!validation.success) {
    return { error: { message: validation.error.errors[0].message }, status: 400 }
  }

  const tenantSettings = await getTenantSettings(options.tenantId)
  const onlyOwnStorePolicy = tenantSettings?.policies.recebedorOnlyOwnStore ?? false

  if (onlyOwnStorePolicy && options.role === "RECEBEDOR" && options.userStoreId && ticket.storeId !== options.userStoreId) {
    return { error: { message: "Permission denied" }, status: 403 }
  }

  const allowStoreChange = !onlyOwnStorePolicy
  const allowedFields = getAllowedEditFields(options.role, allowStoreChange)

  if (allowedFields.size === 0) {
    return { error: { message: "Permission denied" }, status: 403 }
  }

  const normalizedPatch = Object.fromEntries(
    Object.entries(validation.data).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.trim()]
      }
      return [key, value]
    }),
  ) as Record<string, unknown>

  const filteredPatch = Object.fromEntries(
    Object.entries(normalizedPatch).filter(([key, value]) => allowedFields.has(key) && value !== undefined),
  ) as UpdateTicketDetailsInput

  const changedFields = diffEditableFields(ticket, filteredPatch)
  if (Object.keys(changedFields).length === 0) {
    return { status: 200, ticket: { ...ticket } }
  }

  let storeName: string | undefined
  if (filteredPatch.storeId) {
    const store = await getStoreById(filteredPatch.storeId as string, options.tenantId)
    if (!store) {
      return { error: { message: "Loja inválida" }, status: 400 }
    }
    storeName = store.name
  }

  let supplierName = ticket.supplierName
  if (filteredPatch.supplierId) {
    const supplier = await getSupplierById(filteredPatch.supplierId as string, options.tenantId)
    if (!supplier) {
      return { error: { message: "Fornecedor inválido" }, status: 400 }
    }
    supplierName = supplier.name
  }

  const updatePatch: Partial<Ticket> = {}
  Object.keys(changedFields).forEach((field) => {
    updatePatch[field as keyof Ticket] = filteredPatch[field] as never
  })

  if (updatePatch.supplierId && supplierName) {
    updatePatch.supplierName = supplierName
  }

  const searchFieldsChanged = ["nomeRazaoSocial", "cpfCnpj", "celular", "numeroVendaOuCfe", "codigo", "ref"].some(
    (field) => field in updatePatch,
  )

  if (searchFieldsChanged) {
    const mergedTicket = { ...ticket, ...updatePatch }
    updatePatch.searchTokens = buildSearchTokens({
      nomeRazaoSocial: mergedTicket.nomeRazaoSocial,
      cpfCnpj: mergedTicket.cpfCnpj,
      celular: mergedTicket.celular,
      numeroVendaOuCfe: mergedTicket.numeroVendaOuCfe,
      codigo: mergedTicket.codigo,
      ref: mergedTicket.ref,
    })
  }

  const updatedTicket = await updateTicketEditableFields(options.ticketId, options.tenantId, updatePatch)
  if (!updatedTicket) {
    return { error: { message: "Ticket not found" }, status: 404 }
  }

  const now = new Date()
  await addTicketAuditEntry(options.ticketId, {
    ticketId: options.ticketId,
    action: "TICKET_EDIT",
    userId: options.userId,
    userName: options.userName,
    tenantId: options.tenantId,
    metadata: {
      changedFields,
      role: options.role,
      userEmail: options.userEmail,
    },
    createdAt: now,
  })

  const changedLabels = Object.keys(changedFields)
    .map((field) => EDIT_FIELD_LABELS[field] || field)
    .join(", ")

  let timelineEntry: TimelineEntry | undefined
  if (changedLabels) {
    const text = `Dados do ticket atualizados: ${changedLabels}`
    const entryId = await addTimelineEntry(options.ticketId, {
      type: "DOCUMENTO",
      text,
      userId: options.userId,
      userName: options.userName,
    })
    timelineEntry = {
      id: entryId,
      ticketId: options.ticketId,
      type: "DOCUMENTO",
      text,
      userId: options.userId,
      userName: options.userName,
      createdAt: now,
    }
  }

  return {
    status: 200,
    ticket: {
      ...updatedTicket,
      ...(storeName ? { storeName } : {}),
      ...(supplierName ? { supplierName } : {}),
    },
    timelineEntry,
    changedFields,
  }
}

export async function fetchWarrantyList(options: {
  tenantId: string
  status?: Status
  storeId?: string
  supplierId?: string
  search?: string
  onlyOverdue?: boolean
  onlyActionToday?: boolean
  limit?: number
  cursor?: string
}) {
  return listTickets({
    tenantId: options.tenantId,
    status: options.status,
    storeId: options.storeId,
    supplierId: options.supplierId,
    search: options.search,
    onlyOverdue: options.onlyOverdue,
    onlyActionToday: options.onlyActionToday,
    limit: options.limit,
    startAfter: options.cursor,
  })
}

export async function fetchAgendaTickets(options: {
  tenantId: string
  tab: "hoje" | "atrasadas" | "proximos"
  limit?: number
  cursor?: string
}) {
  const today = todayDateOnly(DEFAULT_TIMEZONE)
  const tomorrow = addDaysDateOnly(today, 1)
  const nextWeek = addDaysDateOnly(today, 7)
  const yesterday = addDaysDateOnly(today, -1)

  if (options.tab === "hoje") {
    return listTicketsByNextActionRange({
      tenantId: options.tenantId,
      statuses: AGENDA_STATUSES,
      start: today,
      end: today,
      limit: options.limit,
      startAfter: options.cursor,
    })
  }

  if (options.tab === "proximos") {
    return listTicketsByNextActionRange({
      tenantId: options.tenantId,
      statuses: AGENDA_STATUSES,
      start: tomorrow,
      end: nextWeek,
      limit: options.limit,
      startAfter: options.cursor,
    })
  }

  return listTicketsByNextActionRange({
    tenantId: options.tenantId,
    statuses: AGENDA_STATUSES,
    start: "0000-01-01",
    end: yesterday,
    limit: options.limit,
    startAfter: options.cursor,
  })
}

export async function fetchAgendaCalendar(options: {
  tenantId: string
  month: number
  year: number
}) {
  const firstDay = new Date(options.year, options.month - 1, 1)
  const lastDay = new Date(options.year, options.month, 0)

  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - firstDay.getDay())
  const startDateOnly = toDateOnlyString(start)

  const end = new Date(lastDay)
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()))
  const endDateOnly = toDateOnlyString(end)

  const { tickets, nextCursor } = await listTicketsByNextActionRange({
    tenantId: options.tenantId,
    statuses: AGENDA_STATUSES,
    start: startDateOnly,
    end: endDateOnly,
    limit: MAX_CALENDAR_TICKETS,
  })

  const today = todayDateOnly(DEFAULT_TIMEZONE)
  const tomorrow = addDaysDateOnly(today, 1)
  const next7 = addDaysDateOnly(today, 7)

  const days: Record<string, { TODAY: number; OVERDUE: number; NEXT_7_DAYS: number; total: number }> = {}

  tickets.forEach((ticket) => {
    if (!ticket.nextActionAt) return
    const ticketDate = ticket.nextActionAt
    const key = ticketDate
    const dayBucket = days[key] || { TODAY: 0, OVERDUE: 0, NEXT_7_DAYS: 0, total: 0 }
    dayBucket.total += 1

    if (ticketDate < today) {
      dayBucket.OVERDUE += 1
    } else if (ticketDate === today) {
      dayBucket.TODAY += 1
    } else if (ticketDate >= tomorrow && ticketDate <= next7) {
      dayBucket.NEXT_7_DAYS += 1
    }

    days[key] = dayBucket
  })

  return {
    days,
    range: { start: startDateOnly, end: endDateOnly },
    truncated: Boolean(nextCursor),
  }
}

export async function fetchAgendaDay(options: {
  tenantId: string
  date: string
  limit?: number
  cursor?: string
}) {
  const dateOnly = toDateOnlyString(options.date)
  if (!dateOnly) {
    return { tickets: [], nextCursor: undefined }
  }

  return listTicketsByNextActionRange({
    tenantId: options.tenantId,
    statuses: AGENDA_STATUSES,
    start: dateOnly,
    end: dateOnly,
    limit: options.limit,
    startAfter: options.cursor,
  })
}

export async function advanceTicketStatus(options: {
  ticketId: string
  tenantId: string
  role: Role
  userId: string
  userName: string
  nextStatus?: Status
  note?: string
  supplierId?: string
  resolutionResult?: string
  resolutionNotes?: string
  supplierResponse?: string
}) {
  const ticket = await getTicketById(options.ticketId)
  if (!ticket) {
    return { error: { message: "Ticket not found" }, status: 404 }
  }

  if (ticket.tenantId !== options.tenantId) {
    return { error: { message: "Access denied" }, status: 403 }
  }

  const hasCanhoto = await hasAttachmentOfCategory(options.ticketId, "CANHOTO")

  const transitionError = validateTransition(
    ticket,
    { role: options.role },
    {
      supplierId: options.supplierId,
      resolutionResult: options.resolutionResult,
      supplierResponse: options.supplierResponse,
    },
    { hasCanhoto },
  )

  if (transitionError) {
    return { error: transitionError, status: transitionError.code === "FORBIDDEN" ? 403 : 400 }
  }

  const additionalData: Partial<Ticket> = {}

  if (ticket.status === "INTERNO" && options.supplierId) {
    const supplier = await getSupplierById(options.supplierId, options.tenantId)
    if (!supplier) {
      return { error: { message: "Fornecedor inválido" }, status: 400 }
    }

    additionalData.supplierId = options.supplierId
    additionalData.supplierName = supplier.name
    additionalData.slaDays = supplier.slaDays
    additionalData.deliveredToSupplierAt = new Date()
    additionalData.dueDate = computeDueDate(additionalData.deliveredToSupplierAt, supplier.slaDays)
  }

  if (ticket.status === "COBRANCA_ACOMPANHAMENTO" && options.supplierResponse) {
    additionalData.supplierResponse = options.supplierResponse
  }

  if (ticket.status === "RESOLUCAO") {
    additionalData.resolutionResult = options.resolutionResult
    additionalData.resolutionNotes = options.resolutionNotes
    additionalData.closedAt = new Date()
  }

  const nextStatusMap: Record<Status, Status | null> = {
    RECEBIMENTO: "INTERNO",
    INTERNO: "ENTREGA_LOGISTICA",
    ENTREGA_LOGISTICA: "COBRANCA_ACOMPANHAMENTO",
    COBRANCA_ACOMPANHAMENTO: "RESOLUCAO",
    RESOLUCAO: "ENCERRADO",
    ENCERRADO: null,
  }

  const nextStatus = nextStatusMap[ticket.status]
  if (!nextStatus) {
    return { error: { message: "Cannot advance from this status" }, status: 400 }
  }

  if (options.nextStatus && options.nextStatus !== nextStatus) {
    return { error: { message: "Status alvo inválido" }, status: 400 }
  }

  await updateTicketStatus(options.ticketId, nextStatus, options.userId, options.userName, additionalData)

  const note = options.note?.trim()
  if (note) {
    await addTimelineEntry(options.ticketId, {
      type: "OBS",
      text: note,
      userId: options.userId,
      userName: options.userName,
    })
  }

  return { status: 200, nextStatus }
}

export async function revertTicketStatusWithAudit(options: {
  ticketId: string
  tenantId: string
  userId: string
  userName: string
  role: Role
  targetStatus: Status
  reason: string
}) {
  const ticket = await getTicketById(options.ticketId)
  if (!ticket) {
    return { error: { message: "Ticket not found" }, status: 404 }
  }

  if (ticket.tenantId !== options.tenantId) {
    return { error: { message: "Access denied" }, status: 403 }
  }

  if (options.role !== "ADMIN") {
    return { error: { message: "Permission denied" }, status: 403 }
  }

  await revertTicketStatus(options.ticketId, options.targetStatus, options.userId, options.userName, options.reason)

  return { status: 200 }
}

export async function addTicketTimelineEntry(options: {
  ticketId: string
  tenantId: string
  entry: Omit<TimelineEntry, "id" | "ticketId" | "createdAt">
  updateNextAction?: { nextActionAt: string; nextActionNote?: string }
}) {
  const ticket = await getTicketById(options.ticketId)
  if (!ticket || ticket.tenantId !== options.tenantId) {
    return null
  }

  return addTimelineEntry(options.ticketId, options.entry, options.updateNextAction)
}

export async function addTicketAttachment(options: {
  ticketId: string
  tenantId: string
  ticket?: Ticket
  file: Buffer
  metadata: {
    name: string
    mimeType: string
    size: number
    category: string
    uploadedBy: string
    uploadedByName: string
  }
}): Promise<{ attachmentId: string; ticket: Ticket } | null> {
  const ticket = options.ticket ?? (await getTicketById(options.ticketId))
  if (!ticket || ticket.tenantId !== options.tenantId) {
    return null
  }

  const attachmentId = await addAttachment(options.ticketId, options.file, options.metadata)
  return { attachmentId, ticket }
}

export async function fetchTicketAttachments(options: {
  ticketId: string
  tenantId: string
}): Promise<Attachment[] | null> {
  const ticket = await getTicketById(options.ticketId)
  if (!ticket || ticket.tenantId !== options.tenantId) {
    return null
  }

  return getTicketAttachments(options.ticketId)
}
