import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { adminDb, adminAuth } from "@/lib/firebase/admin"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify user belongs to tenant
    const userDoc = await adminDb.collection("users").doc(id).get()
    if (!userDoc.exists || userDoc.data()?.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid,
    }

    if (body.displayName) {
      updates.displayName = body.displayName
      await adminAuth.updateUser(id, { displayName: body.displayName })
    }

    if (body.role) {
      updates.role = body.role
      await adminAuth.setCustomUserClaims(id, {
        tenantId: session.tenantId,
        role: body.role,
      })
    }

    if (body.storeIds !== undefined) {
      updates.storeIds = body.storeIds
    }

    if (body.active !== undefined) {
      updates.active = body.active
      await adminAuth.updateUser(id, { disabled: !body.active })
    }

    await adminDb.collection("users").doc(id).update(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id } = await params

    // Verify user belongs to tenant
    const userDoc = await adminDb.collection("users").doc(id).get()
    if (!userDoc.exists || userDoc.data()?.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Soft delete - just disable
    await adminAuth.updateUser(id, { disabled: true })
    await adminDb.collection("users").doc(id).update({
      active: false,
      deletedAt: new Date().toISOString(),
      deletedBy: session.uid,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Erro ao excluir usuário" }, { status: 500 })
  }
}
