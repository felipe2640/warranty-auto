import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || !["admin", "supervisor"].includes(session.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify supplier belongs to tenant
    const supplierDoc = await adminDb.collection("suppliers").doc(id).get()
    if (!supplierDoc.exists || supplierDoc.data()?.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid,
    }

    if (body.name) updates.name = body.name
    if (body.cnpj !== undefined) updates.cnpj = body.cnpj
    if (body.email !== undefined) updates.email = body.email
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.slaDays !== undefined) updates.slaDays = body.slaDays
    if (body.active !== undefined) updates.active = body.active

    await adminDb.collection("suppliers").doc(id).update(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating supplier:", error)
    return NextResponse.json({ error: "Erro ao atualizar fornecedor" }, { status: 500 })
  }
}
