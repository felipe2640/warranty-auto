import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"
import { DashboardClient } from "./dashboard-client"
import { listStores } from "@/lib/repositories/admin"
import type { Ticket, Status, Store } from "@/lib/schemas"

interface DashboardStats {
  total: number
  byStatus: Partial<Record<Status, number>>
  todayActions: number
  overdue: number
  resolved30Days: number
  todayTickets: Ticket[]
  overdueTickets: Ticket[]
}

export default async function DashboardPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const session = await requireAuth()

  if (session.tenantId !== tenant) {
    redirect("/login")
  }

  // Fetch stores for selector
  const stores = await listStores(session.tenantId)

  // Fetch tickets for stats
  const ticketsRef = adminDb.collection("tickets")
  let query = ticketsRef.where("tenantId", "==", session.tenantId)

  // Role-based filtering
  if (session.role === "RECEBEDOR" && session.storeId) {
    query = query.where("storeId", "==", session.storeId)
  }

  const snapshot = await query.orderBy("createdAt", "desc").limit(200).get()

  const stats: DashboardStats = {
    total: 0,
    byStatus: {},
    todayActions: 0,
    overdue: 0,
    resolved30Days: 0,
    todayTickets: [],
    overdueTickets: [],
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get store names map
  const storeMap = new Map<string, string>()
  stores.forEach((s: Store) => storeMap.set(s.id, s.name))

  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    const ticket = {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      dueDate: data.dueDate?.toDate?.() || (data.dueDate ? new Date(data.dueDate) : undefined),
      nextActionAt: data.nextActionAt?.toDate?.() || (data.nextActionAt ? new Date(data.nextActionAt) : undefined),
      storeName: storeMap.get(data.storeId) || "—",
    } as Ticket & { storeName: string }

    stats.total++
    stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1

    // Check if action is due today
    if (ticket.nextActionAt) {
      const actionDate = new Date(ticket.nextActionAt)
      if (actionDate >= today && actionDate < tomorrow && ticket.status !== "ENCERRADO") {
        stats.todayActions++
        if (stats.todayTickets.length < 10) {
          stats.todayTickets.push(ticket)
        }
      }
      // Check overdue
      if (actionDate < today && ticket.status !== "ENCERRADO") {
        stats.overdue++
        if (stats.overdueTickets.length < 10) {
          stats.overdueTickets.push(ticket)
        }
      }
    }

    // Also check dueDate for overdue
    if (ticket.dueDate && ticket.status !== "ENCERRADO") {
      const dueDate = new Date(ticket.dueDate)
      if (dueDate < now && !stats.overdueTickets.find((t) => t.id === ticket.id)) {
        stats.overdue++
        if (stats.overdueTickets.length < 10) {
          stats.overdueTickets.push(ticket)
        }
      }
    }

    // Resolved in last 30 days
    if (ticket.status === "ENCERRADO" && ticket.closedAt) {
      const closedAt = new Date(ticket.closedAt)
      if (closedAt >= thirtyDaysAgo) {
        stats.resolved30Days++
      }
    }
  })

  return (
    <DashboardClient
      stats={stats}
      stores={stores}
      tenant={tenant}
      userName={session.name}
      userRole={session.role}
      userStoreId={session.storeId}
    />
  )
}
