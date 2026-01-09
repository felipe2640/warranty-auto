import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const settingsDoc = await adminDb.collection("tenants").doc(session.tenantId).get()

    if (!settingsDoc.exists) {
      return NextResponse.json({
        id: session.tenantId,
        driveFolderId: null,
        defaultSlaDays: 30,
        requireSignature: true,
        attachmentCategories: [
          "NOTA_FISCAL",
          "FOTO_DEFEITO",
          "LAUDO_TECNICO",
          "COMPROVANTE_ENVIO",
          "CANHOTO",
          "OUTROS",
        ],
      })
    }

    return NextResponse.json({ id: settingsDoc.id, ...settingsDoc.data() })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid,
    }

    if (body.driveFolderId !== undefined) updates.driveFolderId = body.driveFolderId
    if (body.defaultSlaDays !== undefined) updates.defaultSlaDays = body.defaultSlaDays
    if (body.requireSignature !== undefined) updates.requireSignature = body.requireSignature
    if (body.attachmentCategories) updates.attachmentCategories = body.attachmentCategories

    await adminDb.collection("tenants").doc(session.tenantId).set(updates, { merge: true })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 })
  }
}
