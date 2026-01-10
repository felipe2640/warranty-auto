import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { deleteAdminUser, updateAdminUser } from "@/lib/services/adminService"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const result = await updateAdminUser({
      tenantId: session.tenantId,
      userId: id,
      updates: body,
      actorId: session.uid,
    })

    if (!result) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id } = await params

    const result = await deleteAdminUser({
      tenantId: session.tenantId,
      userId: id,
      actorId: session.uid,
    })

    if (!result) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 })
  }
}
