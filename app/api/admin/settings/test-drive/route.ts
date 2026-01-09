import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/session"
import { driveClient } from "@/lib/drive/client"

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    if (session.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const { folderId } = await request.json()
    if (!folderId) {
      return NextResponse.json({ success: false, message: "ID da pasta não informado" }, { status: 400 })
    }

    // Try to list files in the folder to test access
    const result = await driveClient.testAccess(folderId)

    if (result.success) {
      return NextResponse.json({ success: true, message: "Conexão bem sucedida! Acesso confirmado." })
    } else {
      return NextResponse.json({ success: false, message: result.error || "Falha ao acessar a pasta" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] Error testing drive:", error)
    return NextResponse.json({ success: false, message: "Erro ao testar conexão com Drive" }, { status: 500 })
  }
}
