import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"
import { supplierSchema } from "@/lib/schemas"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || !["admin", "supervisor", "analista"].includes(session.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const snapshot = await adminDb.collection("suppliers").where("tenantId", "==", session.tenantId).get()

    const suppliers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error("Error fetching suppliers:", error)
    return NextResponse.json({ error: "Erro ao buscar fornecedores" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session || !["admin", "supervisor"].includes(session.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const validation = supplierSchema.omit({ id: true }).safeParse({
      ...body,
      tenantId: session.tenantId,
    })

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const supplierData = {
      ...validation.data,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: session.uid,
    }

    const docRef = await adminDb.collection("suppliers").add(supplierData)

    return NextResponse.json({ id: docRef.id, ...supplierData })
  } catch (error) {
    console.error("Error creating supplier:", error)
    return NextResponse.json({ error: "Erro ao criar fornecedor" }, { status: 500 })
  }
}
