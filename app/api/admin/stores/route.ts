import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { fetchErpStores } from "@/lib/erp/stores"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const stores = await fetchErpStores()
    return NextResponse.json(stores)
  } catch (error) {
    console.error("Error fetching ERP stores:", error)
    return NextResponse.json({ error: "Erro ao buscar lojas no ERP" }, { status: 500 })
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Lojas são gerenciadas exclusivamente pelo ERP e não podem ser criadas aqui" },
    { status: 405 },
  )
}
