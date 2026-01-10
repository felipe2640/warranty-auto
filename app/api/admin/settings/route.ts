import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { fetchTenantSettings, updateAdminSettings } from "@/lib/services/adminService"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const settingsDoc = await fetchTenantSettings(session.tenantId)

    if (!settingsDoc) {
      return NextResponse.json({
        id: session.tenantId,
        driveRootFolderId: null,
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

    return NextResponse.json(settingsDoc)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Erro ao buscar configurações" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: session.uid,
    }

    if (body.name !== undefined) updates.name = body.name
    if (body.driveRootFolderId !== undefined) updates.driveRootFolderId = body.driveRootFolderId
    if (body.policies !== undefined) updates.policies = body.policies
    if (body.defaultSlaDays !== undefined) updates.defaultSlaDays = body.defaultSlaDays
    if (body.requireSignature !== undefined) updates.requireSignature = body.requireSignature
    if (body.attachmentCategories) updates.attachmentCategories = body.attachmentCategories

    const result = await updateAdminSettings({ tenantId: session.tenantId, updates })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Erro ao atualizar configurações" }, { status: 500 })
  }
}
