import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { fetchAgendaDay } from "@/lib/services/warrantyService"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const cursor = searchParams.get("cursor") || undefined
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 20

    if (!date) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 })
    }

    const result = await fetchAgendaDay({
      tenantId: session.tenantId,
      date,
      limit: Number.isNaN(limit) ? 20 : limit,
      cursor,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching agenda day:", error)
    return NextResponse.json({ error: "Erro ao carregar ações do dia" }, { status: 500 })
  }
}
