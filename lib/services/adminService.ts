import {
  createStore,
  createSupplier,
  listUsers,
  listStores,
  listSuppliers,
  updateStore,
  updateSupplier,
  getTenantBySlug,
  getTenantSettings,
  getSupplierById,
  updateTenantSettings,
} from "@/lib/repositories/admin"
import { adminAuth, adminDb } from "@/lib/firebase/admin"
import type { TenantSettings, Store, Supplier, User } from "@/lib/schemas"
import { driveClient } from "@/lib/drive/client"

export async function fetchTenantBySlug(slug: string): Promise<TenantSettings | null> {
  return getTenantBySlug(slug)
}

export async function fetchTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  return getTenantSettings(tenantId)
}

export async function fetchStores(tenantId: string): Promise<Store[]> {
  return listStores(tenantId)
}

export async function fetchSuppliers(tenantId: string): Promise<Supplier[]> {
  return listSuppliers(tenantId)
}

export async function fetchUsers(tenantId: string): Promise<User[]> {
  return listUsers(tenantId)
}

export async function fetchSupplierById(tenantId: string, supplierId: string): Promise<Supplier | null> {
  return getSupplierById(supplierId, tenantId)
}

export async function fetchOpenTicketsCount(tenantId: string) {
  const snapshot = await adminDb
    .collection("tickets")
    .where("tenantId", "==", tenantId)
    .where("status", "!=", "ENCERRADO")
    .count()
    .get()

  return snapshot.data().count
}

export async function listAdminUsers(tenantId: string): Promise<User[]> {
  return listUsers(tenantId)
}

export async function createAdminUser(options: {
  tenantId: string
  email: string
  password: string
  name: string
  role: string
  storeId?: string | null
  createdBy: string
}) {
  const userRecord = await adminAuth.createUser({
    email: options.email,
    password: options.password,
    displayName: options.name,
  })

  const userData = {
    email: options.email,
    name: options.name,
    role: options.role,
    storeId: options.storeId || null,
    tenantId: options.tenantId,
    active: true,
    createdAt: new Date(),
    createdBy: options.createdBy,
  }

  await adminDb.collection("users").doc(userRecord.uid).set(userData)

  await adminAuth.setCustomUserClaims(userRecord.uid, {
    tenantId: options.tenantId,
    role: options.role,
  })

  return { id: userRecord.uid, ...userData }
}

export async function updateAdminUser(options: {
  tenantId: string
  userId: string
  updates: Record<string, unknown>
  actorId: string
}) {
  const userDoc = await adminDb.collection("users").doc(options.userId).get()
  if (!userDoc.exists || userDoc.data()?.tenantId !== options.tenantId) {
    return null
  }

  const updates: Record<string, unknown> = {
    ...options.updates,
    updatedAt: new Date(),
    updatedBy: options.actorId,
  }

  if (options.updates.name) {
    await adminAuth.updateUser(options.userId, { displayName: options.updates.name as string })
  }

  if (options.updates.role) {
    await adminAuth.setCustomUserClaims(options.userId, {
      tenantId: options.tenantId,
      role: options.updates.role as string,
    })
  }

  if (options.updates.active !== undefined) {
    await adminAuth.updateUser(options.userId, { disabled: !(options.updates.active as boolean) })
  }

  await adminDb.collection("users").doc(options.userId).update(updates)

  return { success: true }
}

export async function deleteAdminUser(options: { tenantId: string; userId: string; actorId: string }) {
  const userDoc = await adminDb.collection("users").doc(options.userId).get()
  if (!userDoc.exists || userDoc.data()?.tenantId !== options.tenantId) {
    return null
  }

  await adminAuth.updateUser(options.userId, { disabled: true })
  await adminDb.collection("users").doc(options.userId).update({
    active: false,
    deletedAt: new Date(),
    deletedBy: options.actorId,
  })

  return { success: true }
}

export async function generateUserPasswordResetLink(options: { tenantId: string; userId: string }) {
  const userDoc = await adminDb.collection("users").doc(options.userId).get()
  if (!userDoc.exists || userDoc.data()?.tenantId !== options.tenantId) {
    return null
  }

  const email = userDoc.data()?.email as string | undefined
  if (!email) {
    return { error: "Email do usuário não encontrado" }
  }

  const resetLink = await adminAuth.generatePasswordResetLink(email)
  return { resetLink }
}

export async function listAdminStores(tenantId: string): Promise<Store[]> {
  return listStores(tenantId)
}

export async function createAdminStore(options: { tenantId: string; data: Omit<Store, "id" | "createdAt" | "updatedAt"> }) {
  return createStore(options.data)
}

export async function updateAdminStore(options: { tenantId: string; storeId: string; updates: Partial<Store> }) {
  const doc = await adminDb.collection("stores").doc(options.storeId).get()
  if (!doc.exists || doc.data()?.tenantId !== options.tenantId) {
    return null
  }
  await updateStore(options.storeId, options.updates)
  return { success: true }
}

export async function listAdminSuppliers(tenantId: string): Promise<Supplier[]> {
  return listSuppliers(tenantId)
}

export async function createAdminSupplier(options: {
  tenantId: string
  data: Omit<Supplier, "id" | "createdAt" | "updatedAt">
  createdBy: string
}) {
  const docId = await createSupplier(options.data)
  return { id: docId, ...options.data, active: true, createdBy: options.createdBy }
}

export async function updateAdminSupplier(options: { tenantId: string; supplierId: string; updates: Partial<Supplier> }) {
  const doc = await adminDb.collection("suppliers").doc(options.supplierId).get()
  if (!doc.exists || doc.data()?.tenantId !== options.tenantId) {
    return null
  }
  await updateSupplier(options.supplierId, options.updates)
  return { success: true }
}

export async function updateAdminSettings(options: { tenantId: string; updates: Partial<TenantSettings> }) {
  await updateTenantSettings(options.tenantId, options.updates)
  return { success: true }
}

export async function testDriveAccess(folderId: string) {
  return driveClient.testAccess(folderId)
}

export async function fetchAdminAuditEntries(options: {
  tenantId: string
  startDate?: string | null
  endDate?: string | null
  ticketId?: string | null
  action?: string | null
  userId?: string | null
}) {
  let query = adminDb
    .collectionGroup("audit")
    .where("tenantId", "==", options.tenantId)
    .orderBy("createdAt", "desc")
    .limit(100)

  if (options.ticketId) {
    query = query.where("ticketId", "==", options.ticketId)
  }

  if (options.action && options.action !== "all") {
    query = query.where("action", "==", options.action)
  }

  if (options.userId) {
    query = query.where("userId", "==", options.userId)
  }

  const snapshot = await query.get()

  let entries = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    }
  })

  if (options.startDate) {
    const start = new Date(options.startDate)
    entries = entries.filter((e) => new Date(e.createdAt) >= start)
  }

  if (options.endDate) {
    const end = new Date(options.endDate)
    end.setHours(23, 59, 59, 999)
    entries = entries.filter((e) => new Date(e.createdAt) <= end)
  }

  return entries
}
