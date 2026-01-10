import { getAdminDb } from "../firebase/admin"
import { createFolder, uploadFile } from "../drive/client"
import type { Ticket, Attachment, TimelineEntry, AuditEntry, Status } from "../schemas"
import { STATUS_ORDER } from "../schemas"
import { buildSearchTokens, normalizeSearchToken } from "@/lib/search"
import type * as FirebaseFirestore from "firebase-admin/firestore"

const TICKETS_COLLECTION = "tickets"
const TIMELINE_COLLECTION = "timeline"
const ATTACHMENTS_COLLECTION = "attachments"
const AUDIT_COLLECTION = "audit"

function toDate(timestamp: { toDate: () => Date } | Date | string | undefined): Date | undefined {
  if (!timestamp) return undefined
  if (timestamp instanceof Date) return timestamp
  if (typeof timestamp === "string") return new Date(timestamp)
  if (typeof timestamp.toDate === "function") return timestamp.toDate()
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
    dataVenda: toDate(data.dataVenda)!,
    dataRecebendoPeca: toDate(data.dataRecebendoPeca)!,
    dataIndoFornecedor: toDate(data.dataIndoFornecedor),
    obs: data.obs,
    supplierId: data.supplierId,
    supplierName: data.supplierName,
    slaDays: data.slaDays,
    dueDate: toDate(data.dueDate),
    nextActionAt: toDate(data.nextActionAt),
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

  const ticketData = {
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
  }

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
  if (!ticket) throw new Error("Ticket not found")

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

export async function revertTicketStatus(
  ticketId: string,
  targetStatus: Status,
  userId: string,
  userName: string,
  reason: string,
): Promise<void> {
  const ticket = await getTicketById(ticketId)
  if (!ticket) throw new Error("Ticket not found")

  const currentIndex = STATUS_ORDER.indexOf(ticket.status)
  const targetIndex = STATUS_ORDER.indexOf(targetStatus)

  if (targetIndex >= currentIndex) {
    throw new Error("Can only revert to a previous status")
  }

  const now = new Date()

  await getAdminDb().collection(TICKETS_COLLECTION).doc(ticketId).update({
    status: targetStatus,
    isClosed: targetStatus === "ENCERRADO",
    updatedAt: now,
  })

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
  startDate?: Date
  endDate?: Date
  limit?: number
  startAfter?: string
}

export async function listTickets(options: ListTicketsOptions): Promise<{ tickets: Ticket[]; nextCursor?: string }> {
  let query: FirebaseFirestore.Query = getAdminDb().collection(TICKETS_COLLECTION).where("tenantId", "==", options.tenantId)

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
    query = query.where("isClosed", "==", false).where("dueDate", "<", new Date()).orderBy("dueDate", "asc")
  } else if (options.onlyActionToday) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    query = query.where("nextActionAt", ">=", today).where("nextActionAt", "<", tomorrow).orderBy("nextActionAt", "asc")
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
      nextActionAt: toDate(data.nextActionAt),
      nextActionNote: data.nextActionNote,
      createdAt: toDate(data.createdAt)!,
    }
  })
}

export async function addTimelineEntry(
  ticketId: string,
  entry: Omit<TimelineEntry, "id" | "ticketId" | "createdAt">,
  updateNextAction?: { nextActionAt: Date; nextActionNote?: string },
): Promise<string> {
  const now = new Date()

  const entryData = {
    ...entry,
    ticketId,
    createdAt: now,
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
    throw new Error("Ticket or folder not found")
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
  start: Date
  end: Date
  limit?: number
  startAfter?: string
}): Promise<{ tickets: Ticket[]; nextCursor?: string }> {
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
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
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
    const nextActionAt = toDate(data.nextActionAt)
    const dueDate = toDate(data.dueDate)
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
    if (dueDate && dueDate < now && status !== "ENCERRADO") {
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
