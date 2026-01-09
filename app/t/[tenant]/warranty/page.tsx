import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"
import { WarrantyListClient } from "./warranty-list-client"
import type { Ticket, Store } from "@/lib/schemas"
import type { FirebaseFirestore } from "firebase-admin/firestore"

interface SearchParams {
  status?: string
  storeId?: string
  q?: string
  overSla?: string
}

export default async function WarrantyListPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<SearchParams>
}) {
  const { tenant } = await params
  const filters = await searchParams
  const session = await requireAuth()

  if (session.tenantId !== tenant) {
    redirect("/login")
  }

  // Fetch stores for filter dropdown
  const storesSnap = await adminDb
    .collection("stores")
    .where("tenantId", "==", session.tenantId)
    .where("active", "==", true)
    .get()

  const stores = storesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Store[]

  // Build tickets query
  const ticketsRef = adminDb.collection("tickets")
  let query: FirebaseFirestore.Query = ticketsRef.where("tenantId", "==", session.tenantId)

  // Role-based filtering
  if (session.role === "operador" && session.storeIds?.length) {
    query = query.where("storeId", "in", session.storeIds)
  }

  // Apply filters
  if (filters.status) {
    query = query.where("status", "==", filters.status)
  }

  if (filters.storeId && session.role !== "operador") {
    query = query.where("storeId", "==", filters.storeId)
  }

  // Get tickets ordered by creation date
  query = query.orderBy("createdAt", "desc").limit(50)

  const snapshot = await query.get()
  let tickets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Ticket[]

  // Client-side text search (Firestore doesn't support full-text search)
  if (filters.q) {
    const searchLower = filters.q.toLowerCase()
    tickets = tickets.filter(
      (t) =>
        t.protocol.toLowerCase().includes(searchLower) ||
        t.customerName.toLowerCase().includes(searchLower) ||
        t.partName.toLowerCase().includes(searchLower) ||
        t.serialNumber?.toLowerCase().includes(searchLower) ||
        t.nfNumber?.toLowerCase().includes(searchLower),
    )
  }

  // Filter overSla
  if (filters.overSla === "true") {
    const now = new Date()
    tickets = tickets.filter(
      (t) => t.slaDeadline && new Date(t.slaDeadline) < now && !["FECHADO", "CANCELADO"].includes(t.status),
    )
  }

  return (
    <WarrantyListClient
      tickets={tickets}
      stores={stores}
      tenant={tenant}
      userRole={session.role}
      initialFilters={filters}
    />
  )
}
