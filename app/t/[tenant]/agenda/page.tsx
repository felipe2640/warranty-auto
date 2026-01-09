import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"
import { AgendaClient } from "./agenda-client"
import { listSuppliers, listStores } from "@/lib/repositories/admin"
import type { Ticket, Store } from "@/lib/schemas"

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { tenant } = await params
  const { tab } = await searchParams
  const session = await requireAuth()

  if (session.tenantId !== tenant) {
    redirect("/login")
  }

  // Fetch tickets with nextActionAt (for agenda)
  const ticketsRef = adminDb.collection("tickets")
  const snapshot = await ticketsRef
    .where("tenantId", "==", session.tenantId)
    .where("status", "in", ["COBRANCA_ACOMPANHAMENTO", "ENTREGA_LOGISTICA", "RESOLUCAO"])
    .orderBy("nextActionAt", "asc")
    .get()

  // Fetch suppliers and stores
  const [suppliers, stores] = await Promise.all([listSuppliers(session.tenantId), listStores(session.tenantId)])

  // Create store map
  const storeMap = new Map<string, string>()
  stores.forEach((s: Store) => storeMap.set(s.id, s.name))

  // Create supplier map
  const supplierMap = new Map<string, string>()
  suppliers.forEach((s) => supplierMap.set(s.id, s.name))

  const tickets = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      nextActionAt: data.nextActionAt?.toDate?.() || (data.nextActionAt ? new Date(data.nextActionAt) : undefined),
      dueDate: data.dueDate?.toDate?.() || (data.dueDate ? new Date(data.dueDate) : undefined),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      storeName: storeMap.get(data.storeId) || "—",
      supplierName: data.supplierId ? supplierMap.get(data.supplierId) || data.supplierId : "—",
    }
  }) as (Ticket & { storeName: string; supplierName: string })[]

  // Group tickets by date
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const grouped = {
    today: [] as (Ticket & { storeName: string; supplierName: string })[],
    overdue: [] as (Ticket & { storeName: string; supplierName: string })[],
    next7Days: [] as (Ticket & { storeName: string; supplierName: string })[],
  }

  tickets.forEach((ticket) => {
    if (!ticket.nextActionAt) {
      // No action date set - consider as needing attention
      grouped.overdue.push(ticket)
      return
    }

    const actionDate = new Date(ticket.nextActionAt)
    const actionDay = new Date(actionDate.getFullYear(), actionDate.getMonth(), actionDate.getDate())

    if (actionDay < today) {
      grouped.overdue.push(ticket)
    } else if (actionDay.getTime() === today.getTime()) {
      grouped.today.push(ticket)
    } else if (actionDay < nextWeek) {
      grouped.next7Days.push(ticket)
    }
  })

  // Check canPerformActions based on role
  const canPerformActions = ["COBRANCA", "ADMIN"].includes(session.role)

  return (
    <AgendaClient
      grouped={grouped}
      suppliers={suppliers}
      tenant={tenant}
      userName={session.name}
      userRole={session.role}
      canPerformActions={canPerformActions}
      initialTab={tab || "hoje"}
    />
  )
}
