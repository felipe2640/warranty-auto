import { getAdminDb } from "../firebase/admin"
import { createFolder, uploadFile } from "../drive/client"
import type { Ticket, Attachment, TimelineEntry, AuditEntry, Status } from "../schemas"
import { STATUS_ORDER } from "../schemas"
import { buildSearchTokens, normalizeSearchToken } from "@/lib/search"
import { DEFAULT_TIMEZONE, addDaysDateOnly, isDateOnlyString, toDateOnlyString, todayDateOnly } from "@/lib/date"
import type * as FirebaseFirestore from "firebase-admin/firestore"

const TICKETS_COLLECTION = "tickets"
const TIMELINE_COLLECTION = "timeline"
const ATTACHMENTS_COLLECTION = "attachments"
const AUDIT_COLLECTION = "audit"

function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T
}

function isMissingIndexError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const maybeError = error as { code?: unknown; message?: unknown }
  if (maybeError.code === 9) return true
  if (typeof maybeError.message === "string" && maybeError.message.includes("requires an index")) return true
  return false
}

function toDate(timestamp: { toDate: () => Date } | Date | string | undefined): Date | undefined {
  if (!timestamp) return undefined
  if (timestamp instanceof Date) return timestamp
  if (typeof timestamp === "string") return new Date(timestamp)
  if (typeof timestamp.toDate === "function") return timestamp.toDate()
  return undefined
}

function toDateOnly(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === "string") {
    if (isDateOnlyString(value)) return value
    return toDateOnlyString(value)
  }
  if (value instanceof Date) return toDateOnlyString(value)
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return toDateOnlyString((value as { toDate: () => Date }).toDate())
  }
  return undefined
}

function serializeTicket(doc: FirebaseFirestore.DocumentSnapshot): Ticket | null {
  if (!doc.exists) return null
  const data = doc.data()!

  return {
    id: doc.id,
    tenantId: data.tenantId,
    storeId: data.storeId,
    status: data.status,
    nfIda: data.nfIda,
    nfRetorno: data.nfRetorno,
    boletoComAbatimento: data.boletoComAbatimento,
    remessa: data.remessa,
    retorno: data.retorno,
    nomeRazaoSocial: data.nomeRazaoSocial,
    nomeFantasiaApelido: data.nomeFantasiaApelido,
    cpfCnpj: data.cpfCnpj,
    celular: data.celular,
    isWhatsapp: data.isWhatsapp,
    descricaoPeca: data.descricaoPeca,
    quantidade: data.quantidade,
    ref: data.ref,
    codigo: data.codigo,
    defeitoPeca: data.defeitoPeca,
    numeroVendaOuCfe: data.numeroVendaOuCfe,
    numeroVendaOuCfeFornecedor: data.numeroVendaOuCfeFornecedor,
    dataVenda: toDateOnly(data.dataVenda)!,
    dataRecebendoPeca: toDateOnly(data.dataRecebendoPeca)!,
    dataIndoFornecedor: toDateOnly(data.dataIndoFornecedor),
    obs: data.obs,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    slaDays: data.slaDays,
    dueDate: toDateOnly(data.dueDate),
    nextActionAt: toDateOnly(data.nextActionAt),
    nextActionNote: data.nextActionNote,
    deliveredToSupplierAt: toDate(data.deliveredToSupplierAt),
    supplierResponse: data.supplierResponse,
    resolutionResult: data.resolutionResult,
    resolutionNotes: data.resolutionNotes,
    closedAt: toDate(data.closedAt),
    driveFolderId: data.driveFolderId,
    searchTokens: data.searchTokens,
    isClosed: data.isClosed ?? data.status === "ENCERRADO",
    createdBy: data.createdBy,
    createdAt: toDate(data.createdAt)!,
    updatedAt: toDate(data.updatedAt)!,
    stageHistory: data.stageHistory?.map((s: Record<string, unknown>) => ({
      status: s.status,
      completedAt: toDate(s.completedAt as { toDate: () => Date })!,
      completedBy: s.completedBy,
      completedByName: s.completedByName,
    })),
  }
}

export async function createTicket(
  data: Omit<Ticket, "id" | "createdAt" | "updatedAt" | "status" | "driveFolderId" | "stageHistory">,
  driveRootFolderId: string,
  userId: string,
  userName: string,
): Promise<string> {
  const now = new Date()

  // Create ticket document first to get ID
  const ticketRef = getAdminDb().collection(TICKETS_COLLECTION).doc()
  const ticketId = ticketRef.id

  // Create folder in Drive
  const folderName = `Ticket_${ticketId}_${data.nomeRazaoSocial.substring(0, 20)}`
  const folderId = await createFolder(folderName, driveRootFolderId)

  const ticketData = stripUndefined({
    ...data,
    id: ticketId,
    status: "RECEBIMENTO" as Status,
    driveFolderId: folderId,
    createdAt: now,
    updatedAt: now,
    isClosed: false,
    searchTokens: buildSearchTokens({
      nomeRazaoSocial: data.nomeRazaoSocial,
      cpfCnpj: data.cpfCnpj,
      celular: data.celular,
      numeroVendaOuCfe: data.numeroVendaOuCfe,
      codigo: data.codigo,
      ref: data.ref,
    }),
    stageHistory: [
      {
        status: "RECEBIMENTO",
        completedAt: now,
        completedBy: userId,
        completedByName: userName,
      },
    ],
  })

  await ticketRef.set(ticketData)

  // Create initial timeline entry
  await getAdminDb().collection(TICKETS_COLLECTION).doc(ticketId).collection(TIMELINE_COLLECTION).add({
    ticketId,
    type: "STATUS_CHANGE",
    text: "Ticket criado",
    userId,
    userName,
    createdAt: now,
  })

  return ticketId
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const doc = await getAdminDb().collection(TICKETS_COLLECTION).doc(ticketId).get()
  return serializeTicket(doc)
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: Status,
  userId: string,
  userName: string,
  additionalData?: Partial<Ticket>,
): Promise<void> {
  const ticket = await getTicketById(ticketId)
  if (!ticket) throw new Error("Ticket nao encontrado")

  const now = new Date()
  const stageHistory = ticket.stageHistory || []

  // Add new stage to history
  stageHistory.push({
    status: newStatus,
    completedAt: now,
    completedBy: userId,
    completedByName: userName,
  })

  await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .update({
      status: newStatus,
      stageHistory,
      updatedAt: now,
      isClosed: newStatus === "ENCERRADO",
      ...additionalData,
    })

  // Create timeline entry for status change
  await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(TIMELINE_COLLECTION)
    .add({
      ticketId,
      type: "STATUS_CHANGE",
      text: `Status alterado de ${ticket.status} para ${newStatus}`,
      userId,
      userName,
      createdAt: now,
    })

  // Create audit entry
  await getAdminDb().collection(TICKETS_COLLECTION).doc(ticketId).collection(AUDIT_COLLECTION).add({
    ticketId,
    action: "STATUS_CHANGE",
    fromStatus: ticket.status,
    toStatus: newStatus,
    userId,
    userName,
    tenantId: ticket.tenantId,
    createdAt: now,
  })
}

export async function updateTicketEditableFields(
  ticketId: string,
  tenantId: string,
  patch: Partial<Ticket>,
): Promise<Ticket | null> {
  const ticketRef = getAdminDb().collection(TICKETS_COLLECTION).doc(ticketId)
  const snapshot = await ticketRef.get()

  if (!snapshot.exists) return null

  const data = snapshot.data()
  if (!data || data.tenantId !== tenantId) return null

  const now = new Date()
  await ticketRef.update(stripUndefined({ ...patch, updatedAt: now }))

  const updatedSnapshot = await ticketRef.get()
  return serializeTicket(updatedSnapshot)
}

export async function addTicketAuditEntry(ticketId: string, entry: Omit<AuditEntry, "id">): Promise<void> {
  await getAdminDb().collection(TICKETS_COLLECTION).doc(ticketId).collection(AUDIT_COLLECTION).add(entry)
}

export async function revertTicketStatus(
  ticketId: string,
  targetStatus: Status,
  userId: string,
  userName: string,
  reason: string,
): Promise<void> {
  const ticket = await getTicketById(ticketId)
  if (!ticket) throw new Error("Ticket nao encontrado")

  const currentIndex = STATUS_ORDER.indexOf(ticket.status)
  const targetIndex = STATUS_ORDER.indexOf(targetStatus)

  if (targetIndex >= currentIndex) {
    throw new Error("So e possivel voltar para um status anterior")
  }

  const now = new Date()

  const updateData: Record<string, unknown> = {
    status: targetStatus,
    isClosed: targetStatus === "ENCERRADO",
    updatedAt: now,
  }

  if (targetStatus !== "ENCERRADO") {
    updateData.closedAt = null
  }

  const cobrancaIndex = STATUS_ORDER.indexOf("COBRANCA_ACOMPANHAMENTO")
  const resolucaoIndex = STATUS_ORDER.indexOf("RESOLUCAO")

  // Clear fields from later stages so they can be filled again after a revert.
  if (targetIndex <= cobrancaIndex) {
    updateData.supplierResponse = null
  }

  if (targetIndex <= resolucaoIndex) {
    updateData.resolutionResult = null
    updateData.resolutionNotes = null
  }

  await getAdminDb().collection(TICKETS_COLLECTION).doc(ticketId).update(updateData)

  // Create audit entry for revert
  await getAdminDb().collection(TICKETS_COLLECTION).doc(ticketId).collection(AUDIT_COLLECTION).add({
    ticketId,
    action: "ADMIN_REVERT",
    fromStatus: ticket.status,
    toStatus: targetStatus,
    userId,
    userName,
    reason,
    tenantId: ticket.tenantId,
    createdAt: now,
  })

  // Create timeline entry
  await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(TIMELINE_COLLECTION)
    .add({
      ticketId,
      type: "STATUS_CHANGE",
      text: `Status revertido de ${ticket.status} para ${targetStatus}. Motivo: ${reason}`,
      userId,
      userName,
      createdAt: now,
    })
}

export interface ListTicketsOptions {
  tenantId: string
  status?: Status
  storeId?: string
  supplierId?: string
  search?: string
  onlyOverdue?: boolean
  onlyActionToday?: boolean
  startDate?: string
  endDate?: string
  limit?: number
  startAfter?: string
}

export async function listTickets(options: ListTicketsOptions): Promise<{ tickets: Ticket[]; nextCursor?: string }> {
  try {
    let query: FirebaseFirestore.Query = getAdminDb()
      .collection(TICKETS_COLLECTION)
      .where("tenantId", "==", options.tenantId)

    if (options.status) {
      query = query.where("status", "==", options.status)
    }

    if (options.storeId) {
      query = query.where("storeId", "==", options.storeId)
    }

    if (options.supplierId) {
      query = query.where("supplierId", "==", options.supplierId)
    }

    if (options.onlyOverdue) {
      const today = todayDateOnly(DEFAULT_TIMEZONE)
      query = query.where("isClosed", "==", false).where("dueDate", "<", today).orderBy("dueDate", "asc")
    } else if (options.onlyActionToday) {
      const today = todayDateOnly(DEFAULT_TIMEZONE)
      query = query.where("nextActionAt", "==", today)
    } else {
      query = query.orderBy("createdAt", "desc")
    }

    if (options.search) {
      const token = normalizeSearchToken(options.search)
      if (token) {
        query = query.where("searchTokens", "array-contains", token)
      }
    }

    const limit = options.limit || 20
    query = query.limit(limit + 1) // Fetch one extra to check if there are more

    if (options.startAfter) {
      const startAfterDoc = await getAdminDb().collection(TICKETS_COLLECTION).doc(options.startAfter).get()
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc)
      }
    }

    const snapshot = await query.get()
    const tickets = snapshot.docs.slice(0, limit).map((doc) => serializeTicket(doc)!)
    const nextCursor = snapshot.docs.length > limit ? snapshot.docs[limit - 1].id : undefined

    return { tickets, nextCursor }
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error
    }
    return listTicketsWithoutIndex(options)
  }
}

async function listTicketsWithoutIndex(options: ListTicketsOptions): Promise<{ tickets: Ticket[]; nextCursor?: string }> {
  const snapshot = await getAdminDb().collection(TICKETS_COLLECTION).where("tenantId", "==", options.tenantId).get()

  let tickets = snapshot.docs
    .map((doc) => serializeTicket(doc))
    .filter((ticket): ticket is Ticket => ticket !== null)

  if (options.status) {
    tickets = tickets.filter((ticket) => ticket.status === options.status)
  }

  if (options.storeId) {
    tickets = tickets.filter((ticket) => ticket.storeId === options.storeId)
  }

  if (options.supplierId) {
    tickets = tickets.filter((ticket) => ticket.supplierId === options.supplierId)
  }

  if (options.search) {
    const token = normalizeSearchToken(options.search)
    if (token) {
      tickets = tickets.filter((ticket) => ticket.searchTokens?.includes(token))
    }
  }

  const today = todayDateOnly(DEFAULT_TIMEZONE)
  if (options.onlyOverdue) {
    tickets = tickets.filter((ticket) => !ticket.isClosed && ticket.dueDate && ticket.dueDate < today)
  } else if (options.onlyActionToday) {
    tickets = tickets.filter((ticket) => ticket.nextActionAt && ticket.nextActionAt === today)
  }

  if (options.onlyOverdue) {
    tickets.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))
  } else if (options.onlyActionToday) {
    tickets.sort((a, b) => (a.nextActionAt || "").localeCompare(b.nextActionAt || ""))
  } else {
    tickets.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
  }

  const limit = options.limit || 20
  let startIndex = 0

  if (options.startAfter) {
    const index = tickets.findIndex((ticket) => ticket.id === options.startAfter)
    if (index >= 0) {
      startIndex = index + 1
    }
  }

  const paged = tickets.slice(startIndex, startIndex + limit + 1)
  const results = paged.slice(0, limit)
  const nextCursor = paged.length > limit ? results[results.length - 1]?.id : undefined

  return { tickets: results, nextCursor }
}

export async function getTicketTimeline(ticketId: string): Promise<TimelineEntry[]> {
  const snapshot = await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(TIMELINE_COLLECTION)
    .orderBy("createdAt", "desc")
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ticketId: data.ticketId,
      type: data.type,
      text: data.text,
      userId: data.userId,
      userName: data.userName,
      nextActionAt: toDateOnly(data.nextActionAt),
      nextActionNote: data.nextActionNote,
      attachmentId: data.attachmentId,
      attachmentDriveFileId: data.attachmentDriveFileId,
      attachmentName: data.attachmentName,
      attachmentCategory: data.attachmentCategory,
      attachmentMimeType: data.attachmentMimeType,
      attachmentSize: data.attachmentSize,
      createdAt: toDate(data.createdAt)!,
    }
  })
}

export async function addTimelineEntry(
  ticketId: string,
  entry: Omit<TimelineEntry, "id" | "ticketId" | "createdAt">,
  updateNextAction?: { nextActionAt: string | null; nextActionNote?: string | null },
): Promise<string> {
  const now = new Date()

  const entryData: Record<string, unknown> = {
    ticketId,
    type: entry.type,
    text: entry.text,
    userId: entry.userId,
    userName: entry.userName,
    createdAt: now,
  }

  if (entry.nextActionAt !== undefined) {
    entryData.nextActionAt = entry.nextActionAt
  }

  if (entry.nextActionNote !== undefined) {
    entryData.nextActionNote = entry.nextActionNote
  }

  if (entry.attachmentId !== undefined) {
    entryData.attachmentId = entry.attachmentId
  }

  if (entry.attachmentDriveFileId !== undefined) {
    entryData.attachmentDriveFileId = entry.attachmentDriveFileId
  }

  if (entry.attachmentName !== undefined) {
    entryData.attachmentName = entry.attachmentName
  }

  if (entry.attachmentCategory !== undefined) {
    entryData.attachmentCategory = entry.attachmentCategory
  }

  if (entry.attachmentMimeType !== undefined) {
    entryData.attachmentMimeType = entry.attachmentMimeType
  }

  if (entry.attachmentSize !== undefined) {
    entryData.attachmentSize = entry.attachmentSize
  }

  const docRef = await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(TIMELINE_COLLECTION)
    .add(entryData)

  // Update ticket's next action if specified
  if (updateNextAction) {
    await getAdminDb()
      .collection(TICKETS_COLLECTION)
      .doc(ticketId)
      .update({
        nextActionAt: updateNextAction.nextActionAt,
        nextActionNote: updateNextAction.nextActionNote || null,
        updatedAt: now,
      })
  }

  return docRef.id
}

export async function getTicketAttachments(ticketId: string): Promise<Attachment[]> {
  const snapshot = await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(ATTACHMENTS_COLLECTION)
    .orderBy("uploadedAt", "desc")
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ticketId: data.ticketId,
      category: data.category,
      name: data.name,
      mimeType: data.mimeType,
      size: data.size,
      driveFileId: data.driveFileId,
      uploadedBy: data.uploadedBy,
      uploadedAt: toDate(data.uploadedAt)!,
    }
  })
}

export async function getTicketAttachmentById(ticketId: string, attachmentId: string): Promise<Attachment | null> {
  const doc = await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(ATTACHMENTS_COLLECTION)
    .doc(attachmentId)
    .get()

  if (!doc.exists) return null
  const data = doc.data()!
  return {
    id: doc.id,
    ticketId: data.ticketId,
    category: data.category,
    name: data.name,
    mimeType: data.mimeType,
    size: data.size,
    driveFileId: data.driveFileId,
    uploadedBy: data.uploadedBy,
    uploadedAt: toDate(data.uploadedAt)!,
  }
}

export async function addAttachment(
  ticketId: string,
  file: Buffer,
  metadata: {
    name: string
    mimeType: string
    size: number
    category: string
    uploadedBy: string
    uploadedByName: string
  },
): Promise<string> {
  const ticket = await getTicketById(ticketId)
  if (!ticket || !ticket.driveFolderId) {
    throw new Error("Ticket ou pasta nao encontrada")
  }

  // Upload to Drive
  const driveFileId = await uploadFile(file, metadata.name, metadata.mimeType, ticket.driveFolderId)

  const now = new Date()

  // Save metadata to Firestore
  const attachmentData = {
    ticketId,
    category: metadata.category,
    name: metadata.name,
    mimeType: metadata.mimeType,
    size: metadata.size,
    driveFileId,
    uploadedBy: metadata.uploadedBy,
    uploadedAt: now,
  }

  const docRef = await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(ATTACHMENTS_COLLECTION)
    .add(attachmentData)

  // Create audit entry
  await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(AUDIT_COLLECTION)
    .add({
      ticketId,
      action: "UPLOAD",
      userId: metadata.uploadedBy,
      userName: metadata.uploadedByName,
      metadata: { fileName: metadata.name, category: metadata.category },
      tenantId: ticket.tenantId,
      createdAt: now,
    })

  return docRef.id
}

export async function getTicketAudit(ticketId: string): Promise<AuditEntry[]> {
  const snapshot = await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(AUDIT_COLLECTION)
    .orderBy("createdAt", "desc")
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ticketId: data.ticketId,
      action: data.action,
      fromStatus: data.fromStatus,
      toStatus: data.toStatus,
      userId: data.userId,
      userName: data.userName,
      reason: data.reason,
      metadata: data.metadata,
      createdAt: toDate(data.createdAt)!,
    }
  })
}

export async function findAttachmentByDriveFileId(driveFileId: string): Promise<{
  ticketId: string
  tenantId: string
} | null> {
  const snapshot = await getAdminDb()
    .collectionGroup(ATTACHMENTS_COLLECTION)
    .where("driveFileId", "==", driveFileId)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const attachmentDoc = snapshot.docs[0]
  const ticketRef = attachmentDoc.ref.parent.parent

  if (!ticketRef) {
    return null
  }

  const ticketDoc = await ticketRef.get()
  if (!ticketDoc.exists) {
    return null
  }

  const data = ticketDoc.data() as Ticket
  return {
    ticketId: ticketDoc.id,
    tenantId: data.tenantId,
  }
}

export async function listTicketsByNextActionRange(options: {
  tenantId: string
  statuses?: Status[]
  start: string
  end: string
  limit?: number
  startAfter?: string
}): Promise<{ tickets: Ticket[]; nextCursor?: string }> {
  try {
    let query: FirebaseFirestore.Query = getAdminDb()
      .collection(TICKETS_COLLECTION)
      .where("tenantId", "==", options.tenantId)
      .where("nextActionAt", ">=", options.start)
      .where("nextActionAt", "<=", options.end)
      .orderBy("nextActionAt", "asc")

    if (options.statuses?.length) {
      query = query.where("status", "in", options.statuses)
    }

    const limit = options.limit || 20
    query = query.limit(limit + 1)

    if (options.startAfter) {
      const startAfterDoc = await getAdminDb().collection(TICKETS_COLLECTION).doc(options.startAfter).get()
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc)
      }
    }

    const snapshot = await query.get()
    const tickets = snapshot.docs.slice(0, limit).map((doc) => serializeTicket(doc)!)
    const nextCursor = snapshot.docs.length > limit ? snapshot.docs[limit - 1].id : undefined

    return { tickets, nextCursor }
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error
    }
    return listTicketsByNextActionRangeWithoutIndex(options)
  }
}

async function listTicketsByNextActionRangeWithoutIndex(options: {
  tenantId: string
  statuses?: Status[]
  start: string
  end: string
  limit?: number
  startAfter?: string
}): Promise<{ tickets: Ticket[]; nextCursor?: string }> {
  const snapshot = await getAdminDb().collection(TICKETS_COLLECTION).where("tenantId", "==", options.tenantId).get()

  let tickets = snapshot.docs
    .map((doc) => serializeTicket(doc))
    .filter((ticket): ticket is Ticket => ticket !== null)

  if (options.statuses?.length) {
    const allowed = new Set(options.statuses)
    tickets = tickets.filter((ticket) => allowed.has(ticket.status))
  }

  tickets = tickets.filter(
    (ticket) => ticket.nextActionAt && ticket.nextActionAt >= options.start && ticket.nextActionAt <= options.end,
  )

  tickets.sort((a, b) => (a.nextActionAt || "").localeCompare(b.nextActionAt || ""))

  const limit = options.limit || 20
  let startIndex = 0

  if (options.startAfter) {
    const index = tickets.findIndex((ticket) => ticket.id === options.startAfter)
    if (index >= 0) {
      startIndex = index + 1
    }
  }

  const paged = tickets.slice(startIndex, startIndex + limit + 1)
  const results = paged.slice(0, limit)
  const nextCursor = paged.length > limit ? results[results.length - 1]?.id : undefined

  return { tickets: results, nextCursor }
}

export async function hasAttachmentOfCategory(ticketId: string, category: string): Promise<boolean> {
  const snapshot = await getAdminDb()
    .collection(TICKETS_COLLECTION)
    .doc(ticketId)
    .collection(ATTACHMENTS_COLLECTION)
    .where("category", "==", category)
    .limit(1)
    .get()

  return !snapshot.empty
}

export async function getDashboardCounts(tenantId: string, storeId?: string) {
  const now = new Date()
  const today = todayDateOnly(DEFAULT_TIMEZONE)
  const tomorrow = addDaysDateOnly(today, 1)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  let baseQuery: FirebaseFirestore.Query = getAdminDb().collection(TICKETS_COLLECTION).where("tenantId", "==", tenantId)

  if (storeId) {
    baseQuery = baseQuery.where("storeId", "==", storeId)
  }

  // Get all tickets for counting
  const allTickets = await baseQuery.get()

  let total = 0
  let actionsToday = 0
  let overdue = 0
  let recebimento = 0
  let interno = 0
  let logistica = 0
  let cobranca = 0
  let resolucao = 0
  let encerrado = 0
  let resolved30Days = 0

  allTickets.docs.forEach((doc) => {
    const data = doc.data()
    const status = data.status
    total++
    const nextActionAt = toDateOnly(data.nextActionAt)
    const dueDate = toDateOnly(data.dueDate)
    const closedAt = toDate(data.closedAt)

    // Count by status
    if (status === "RECEBIMENTO") recebimento++
    if (status === "INTERNO") interno++
    if (status === "ENTREGA_LOGISTICA") logistica++
    if (status === "COBRANCA_ACOMPANHAMENTO") cobranca++
    if (status === "RESOLUCAO") resolucao++
    if (status === "ENCERRADO") encerrado++

    // Actions today
    if (nextActionAt && nextActionAt >= today && nextActionAt < tomorrow) {
      actionsToday++
    }

    // Overdue
    if (dueDate && dueDate < today && status !== "ENCERRADO") {
      overdue++
    }

    // Resolved in last 30 days
    if (status === "ENCERRADO" && closedAt && closedAt >= thirtyDaysAgo) {
      resolved30Days++
    }
  })

  return {
    total,
    actionsToday,
    overdue,
    recebimento,
    interno,
    logistica,
    cobranca,
    resolucao,
    encerrado,
    resolved30Days,
  }
}
