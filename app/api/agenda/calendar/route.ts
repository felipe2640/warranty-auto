import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { fetchAgendaCalendar } from "@/lib/services/warrantyService"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = Number.parseInt(searchParams.get("month") || "", 10)
    const year = Number.parseInt(searchParams.get("year") || "", 10)

    if (!month || month < 1 || month > 12 || !year) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 })
    }

    const data = await fetchAgendaCalendar({ tenantId: session.tenantId, month, year })
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching agenda calendar:", error)
    return NextResponse.json({ error: "Erro ao carregar calendário" }, { status: 500 })
  }
}
