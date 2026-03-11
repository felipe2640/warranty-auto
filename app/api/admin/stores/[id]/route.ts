import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"

export async function PATCH() {
  const session = await getServerSession()
  if (!session || session.role !== ADMIN_ROLE) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
  }

  return NextResponse.json(
    { error: "Lojas são gerenciadas exclusivamente pelo ERP e não podem ser editadas aqui" },
    { status: 405 },
  )
}
