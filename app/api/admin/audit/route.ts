import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"

export async function GET(request: Request) {
  try {
    const session = await requireAuth()
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const ticketId = searchParams.get("ticketId")
    const action = searchParams.get("action")

    let query = adminDb
      .collection("audit")
      .where("tenantId", "==", session.tenantId)
      .orderBy("createdAt", "desc")
      .limit(100)

    if (ticketId) {
      query = query.where("ticketId", "==", ticketId)
    }

    if (action && action !== "all") {
      query = query.where("action", "==", action)
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

    // Filter by date range in memory if needed
    if (startDate) {
      const start = new Date(startDate)
      entries = entries.filter((e) => new Date(e.createdAt) >= start)
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      entries = entries.filter((e) => new Date(e.createdAt) <= end)
    }

    return NextResponse.json({ entries })
  } catch (error) {
    console.error("[v0] Error fetching audit:", error)
    return NextResponse.json({ error: "Erro ao buscar auditoria" }, { status: 500 })
  }
}
