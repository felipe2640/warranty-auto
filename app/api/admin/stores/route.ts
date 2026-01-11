import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { storeSchema } from "@/lib/schemas"
import { ADMIN_ROLE } from "@/lib/roles"
import { createAdminStore, listAdminStores } from "@/lib/services/adminService"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const stores = await listAdminStores(session.tenantId)
    return NextResponse.json(stores)
  } catch (error) {
    console.error("Error fetching stores:", error)
    return NextResponse.json({ error: "Erro ao buscar lojas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const validation = storeSchema.omit({ id: true, createdAt: true, updatedAt: true }).safeParse({
      ...body,
      code: body.code || body.name,
      tenantId: session.tenantId,
    })

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const storeData = {
      ...validation.data,
      active: true,
    }

    const result = await createAdminStore({
      tenantId: session.tenantId,
      data: storeData,
    })

    return NextResponse.json({ id: result, ...storeData })
  } catch (error) {
    console.error("Error creating store:", error)
    return NextResponse.json({ error: "Erro ao criar loja" }, { status: 500 })
  }
}
