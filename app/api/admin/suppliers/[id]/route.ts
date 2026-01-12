import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { ADMIN_ROLE } from "@/lib/roles"
import { updateAdminSupplier } from "@/lib/services/adminService"
import { onlyDigits } from "@/lib/format"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const result = await updateAdminSupplier({
      tenantId: session.tenantId,
      supplierId: id,
      updates: {
        name: body.name,
        cnpj: typeof body.cnpj === "string" ? onlyDigits(body.cnpj).slice(0, 14) : body.cnpj,
        email: body.email,
        phone: typeof body.phone === "string" ? onlyDigits(body.phone).slice(0, 11) : body.phone,
        slaDays: body.slaDays,
        active: body.active,
        updatedAt: new Date(),
        updatedBy: session.uid,
      },
    })

    if (!result) {
      return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error updating supplier:", error)
    return NextResponse.json({ error: "Erro ao atualizar fornecedor" }, { status: 500 })
  }
}
