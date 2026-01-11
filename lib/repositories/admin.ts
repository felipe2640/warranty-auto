import { getAdminAuth, getAdminDb } from "../firebase/admin"
import type { User, Store, Supplier, TenantSettings } from "../schemas"
import type { FirebaseFirestore } from "firebase-admin/firestore"

function isMissingIndexError(error: unknown) {
  if (!error || typeof error !== "object") return false
  const maybeError = error as { code?: unknown; message?: unknown }
  if (maybeError.code === 9) return true
  if (typeof maybeError.message === "string" && maybeError.message.includes("requires an index")) return true
  return false
}

function byNameAsc<T extends { name?: string }>(a: T, b: T) {
  return (a.name || "").localeCompare(b.name || "")
}

function toDate(timestamp: { toDate: () => Date } | Date | undefined): Date | undefined {
  if (!timestamp) return undefined
  if (timestamp instanceof Date) return timestamp
  if (typeof timestamp.toDate === "function") return timestamp.toDate()
  return undefined
}

// Users
export async function listUsers(tenantId: string): Promise<User[]> {
  let snapshot: FirebaseFirestore.QuerySnapshot

  try {
    snapshot = await getAdminDb().collection("users").where("tenantId", "==", tenantId).orderBy("name").get()
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error
    }
    snapshot = await getAdminDb().collection("users").where("tenantId", "==", tenantId).get()
  }

  const users = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      role: data.role,
      tenantId: data.tenantId,
      storeId: data.storeId,
      active: data.active,
      createdAt: toDate(data.createdAt)!,
      updatedAt: toDate(data.updatedAt)!,
    }
  })

  return users.sort(byNameAsc)
}

export async function createUser(
  data: Omit<User, "id" | "createdAt" | "updatedAt">,
  temporaryPassword: string,
): Promise<{ userId: string; temporaryPassword: string }> {
  // Create Firebase Auth user
  const userRecord = await getAdminAuth().createUser({
    email: data.email,
    password: temporaryPassword,
    displayName: data.name,
  })

  const now = new Date()

  // Create Firestore user document
  await getAdminDb()
    .collection("users")
    .doc(userRecord.uid)
    .set({
      ...data,
      id: userRecord.uid,
      createdAt: now,
      updatedAt: now,
    })

  return { userId: userRecord.uid, temporaryPassword }
}

export async function updateUser(userId: string, data: Partial<User>): Promise<void> {
  const now = new Date()

  await getAdminDb()
    .collection("users")
    .doc(userId)
    .update({
      ...data,
      updatedAt: now,
    })

  // Update Auth if email changed
  if (data.email) {
    await getAdminAuth().updateUser(userId, { email: data.email })
  }

  if (data.name) {
    await getAdminAuth().updateUser(userId, { displayName: data.name })
  }
}

export async function generatePasswordResetLink(email: string): Promise<string> {
  return getAdminAuth().generatePasswordResetLink(email)
}

// Stores
export async function listStores(tenantId: string): Promise<Store[]> {
  let snapshot: FirebaseFirestore.QuerySnapshot

  try {
    snapshot = await getAdminDb().collection("stores").where("tenantId", "==", tenantId).orderBy("name").get()
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error
    }
    snapshot = await getAdminDb().collection("stores").where("tenantId", "==", tenantId).get()
  }

  const stores = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name,
      code: data.code,
      cnpj: data.cnpj,
      address: data.address,
      phone: data.phone,
      tenantId: data.tenantId,
      active: data.active,
      createdAt: toDate(data.createdAt)!,
      updatedAt: toDate(data.updatedAt)!,
    }
  })

  return stores.sort(byNameAsc)
}

export async function createStore(data: Omit<Store, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date()
  const docRef = await getAdminDb().collection("stores").add({
    ...data,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateStore(storeId: string, data: Partial<Store>): Promise<void> {
  await getAdminDb()
    .collection("stores")
    .doc(storeId)
    .update({
      ...data,
      updatedAt: new Date(),
    })
}

// Suppliers
export async function listSuppliers(tenantId: string): Promise<Supplier[]> {
  let snapshot: FirebaseFirestore.QuerySnapshot

  try {
    snapshot = await getAdminDb().collection("suppliers").where("tenantId", "==", tenantId).orderBy("name").get()
  } catch (error) {
    if (!isMissingIndexError(error)) {
      throw error
    }
    snapshot = await getAdminDb().collection("suppliers").where("tenantId", "==", tenantId).get()
  }

  const suppliers = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      name: data.name,
      slaDays: data.slaDays,
      cnpj: data.cnpj,
      phone: data.phone,
      email: data.email,
      tenantId: data.tenantId,
      active: data.active,
      createdAt: toDate(data.createdAt)!,
      updatedAt: toDate(data.updatedAt)!,
    }
  })

  return suppliers.sort(byNameAsc)
}

export async function getSupplierById(supplierId: string, tenantId: string): Promise<Supplier | null> {
  const doc = await getAdminDb().collection("suppliers").doc(supplierId).get()
  if (!doc.exists) return null

  const data = doc.data()!
  if (data.tenantId !== tenantId) return null
  return {
    id: doc.id,
    name: data.name,
    slaDays: data.slaDays,
    cnpj: data.cnpj,
    phone: data.phone,
    email: data.email,
    tenantId: data.tenantId,
    active: data.active,
    createdAt: toDate(data.createdAt)!,
    updatedAt: toDate(data.updatedAt)!,
  }
}

export async function createSupplier(data: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date()
  const docRef = await getAdminDb().collection("suppliers").add({
    ...data,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateSupplier(supplierId: string, data: Partial<Supplier>): Promise<void> {
  await getAdminDb()
    .collection("suppliers")
    .doc(supplierId)
    .update({
      ...data,
      updatedAt: new Date(),
    })
}

// Tenant Settings
export async function getTenantSettings(tenantId: string): Promise<TenantSettings | null> {
  const doc = await getAdminDb().collection("tenants").doc(tenantId).get()
  if (!doc.exists) return null

  const data = doc.data()!
  return {
    id: doc.id,
    slug: data.slug,
    name: data.name,
    driveRootFolderId: data.driveRootFolderId,
    serviceAccountEmail: data.serviceAccountEmail,
    policies: data.policies || {
      recebedorOnlyOwnStore: true,
      requireCanhotForCobranca: true,
      allowCloseWithoutResolution: false,
      defaultSlaDays: undefined,
    },
    createdAt: toDate(data.createdAt)!,
    updatedAt: toDate(data.updatedAt)!,
  }
}

export async function getTenantBySlug(slug: string): Promise<TenantSettings | null> {
  const snapshot = await getAdminDb().collection("tenants").where("slug", "==", slug).limit(1).get()

  if (snapshot.empty) return null

  const doc = snapshot.docs[0]
  const data = doc.data()

  return {
    id: doc.id,
    slug: data.slug,
    name: data.name,
    driveRootFolderId: data.driveRootFolderId,
    serviceAccountEmail: data.serviceAccountEmail,
    policies: data.policies || {
      recebedorOnlyOwnStore: true,
      requireCanhotForCobranca: true,
      allowCloseWithoutResolution: false,
      defaultSlaDays: undefined,
    },
    createdAt: toDate(data.createdAt)!,
    updatedAt: toDate(data.updatedAt)!,
  }
}

export async function updateTenantSettings(tenantId: string, data: Partial<TenantSettings>): Promise<void> {
  await getAdminDb()
    .collection("tenants")
    .doc(tenantId)
    .update({
      ...data,
      updatedAt: new Date(),
    })
}

// Audit
export async function getGlobalAudit(
  tenantId: string,
  options?: {
    userId?: string
    ticketId?: string
    type?: string
    startDate?: Date
    endDate?: Date
    limit?: number
  },
): Promise<Array<{ ticketId: string; entries: Array<Record<string, unknown>> }>> {
  // This would require a more complex query structure
  // For now, we'll fetch from individual ticket audit collections
  const ticketsSnapshot = await getAdminDb()
    .collection("tickets")
    .where("tenantId", "==", tenantId)
    .orderBy("createdAt", "desc")
    .limit(options?.limit || 50)
    .get()

  const results: Array<{ ticketId: string; entries: Array<Record<string, unknown>> }> = []

  for (const ticketDoc of ticketsSnapshot.docs) {
    let auditQuery: FirebaseFirestore.Query = getAdminDb()
      .collection("tickets")
      .doc(ticketDoc.id)
      .collection("audit")
      .orderBy("createdAt", "desc")

    if (options?.userId) {
      auditQuery = auditQuery.where("userId", "==", options.userId)
    }

    if (options?.type) {
      auditQuery = auditQuery.where("action", "==", options.type)
    }

    const auditSnapshot = await auditQuery.limit(10).get()

    if (!auditSnapshot.empty) {
      results.push({
        ticketId: ticketDoc.id,
        entries: auditSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: toDate(doc.data().createdAt),
        })),
      })
    }
  }

  return results
}
