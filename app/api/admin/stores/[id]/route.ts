import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify store belongs to tenant
    const storeDoc = await adminDb.collection("stores").doc(id).get()
    if (!storeDoc.exists || storeDoc.data()?.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 })
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid,
    }

    if (body.name) updates.name = body.name
    if (body.cnpj !== undefined) updates.cnpj = body.cnpj
    if (body.address !== undefined) updates.address = body.address
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.active !== undefined) updates.active = body.active

    await adminDb.collection("stores").doc(id).update(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating store:", error)
    return NextResponse.json({ error: "Erro ao atualizar loja" }, { status: 500 })
  }
}
