import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { userCreateSchema } from "@/lib/schemas"
import { ADMIN_ROLE } from "@/lib/roles"
import { createAdminUser, listAdminUsers } from "@/lib/services/adminService"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const users = await listAdminUsers(session.tenantId)
    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const validation = userCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const { email, password, name, role, storeId } = validation.data
    const result = await createAdminUser({
      tenantId: session.tenantId,
      email,
      password,
      name,
      role,
      storeId,
      createdBy: session.uid,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating user:", error)
    const message = error instanceof Error ? error.message : "Erro ao criar usuário"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
