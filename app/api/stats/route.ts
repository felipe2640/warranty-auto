import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { getAdminDb } from "@/lib/firebase/admin"
import type { Ticket, Status } from "@/lib/schemas"
import type { FirebaseFirestore } from "firebase-admin/firestore"
import { DEFAULT_TIMEZONE, todayDateOnly } from "@/lib/date"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const ticketsRef = getAdminDb().collection("tickets")
    let query: FirebaseFirestore.Query = ticketsRef.where("tenantId", "==", session.tenantId)

    // Operators can only see their store's tickets
    if (session.role === "RECEBEDOR" && session.storeId) {
      query = query.where("storeId", "==", session.storeId)
    }

    const snapshot = await query.get()

    const stats = {
      total: 0,
      byStatus: {} as Record<Status, number>,
      pendingAction: 0,
      overSla: 0,
      thisWeek: 0,
      thisMonth: 0,
    }

    const now = new Date()
    const today = todayDateOnly(DEFAULT_TIMEZONE)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    snapshot.docs.forEach((doc) => {
      const ticket = doc.data() as Ticket
      stats.total++

      // By status
      stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1

      // Pending action (not closed or cancelled)
      if (!["ENCERRADO"].includes(ticket.status)) {
        stats.pendingAction++

        // Check SLA breach
        if (ticket.dueDate && ticket.dueDate < today) stats.overSla++
      }

      // Time-based stats
      const createdAt = new Date(ticket.createdAt)
      if (createdAt >= weekAgo) stats.thisWeek++
      if (createdAt >= monthAgo) stats.thisMonth++
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Erro ao buscar estatísticas" }, { status: 500 })
  }
}
