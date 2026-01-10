import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { testDriveAccess } from "@/lib/services/adminService"

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    if (session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { folderId } = await request.json()
    if (!folderId) {
      return NextResponse.json({ success: false, message: "ID da pasta não informado" }, { status: 400 })
    }

    const result = await testDriveAccess(folderId)

    if (result.success) {
      return NextResponse.json({ success: true, message: "Conexão bem sucedida! Acesso confirmado." })
    }

    return NextResponse.json({ success: false, message: result.error || "Falha ao acessar a pasta" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error testing drive:", error)
    return NextResponse.json({ success: false, message: "Erro ao testar conexão com Drive" }, { status: 500 })
  }
}
