import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { generateUserPasswordResetLink } from "@/lib/services/adminService"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id } = await params

    const result = await generateUserPasswordResetLink({
      tenantId: session.tenantId,
      userId: id,
    })

    if (!result) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const url = new URL(result.resetLink)
    url.searchParams.set("lang", "pt-br")
    const localizedLink = url.toString()
    return NextResponse.json({ resetLink: localizedLink })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json({ error: "Erro ao gerar link de reset" }, { status: 500 })
  }
}
