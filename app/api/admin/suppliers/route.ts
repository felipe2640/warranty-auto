import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { supplierSchema } from "@/lib/schemas"
import { ADMIN_ROLE } from "@/lib/roles"
import { createAdminSupplier, listAdminSuppliers } from "@/lib/services/adminService"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const suppliers = await listAdminSuppliers(session.tenantId)
    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return NextResponse.json({ error: "Erro ao buscar fornecedores" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== ADMIN_ROLE) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const normalizeOptionalString = (value: unknown) => {
      if (typeof value !== "string") return undefined
      const trimmed = value.trim()
      return trimmed ? trimmed : undefined
    }

    const name = typeof body.name === "string" ? body.name.trim() : body.name
    const slaDays = typeof body.slaDays === "string" ? Number.parseInt(body.slaDays, 10) : body.slaDays

    const validation = supplierSchema.omit({ id: true, createdAt: true, updatedAt: true }).safeParse({
      ...body,
      name,
      slaDays,
      cnpj: normalizeOptionalString(body.cnpj),
      email: normalizeOptionalString(body.email),
      phone: normalizeOptionalString(body.phone),
      tenantId: session.tenantId,
    })

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const result = await createAdminSupplier({
      tenantId: session.tenantId,
      data: {
        ...validation.data,
        active: true,
      },
      createdBy: session.uid,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "Erro ao criar fornecedor" }, { status: 500 })
  }
}
