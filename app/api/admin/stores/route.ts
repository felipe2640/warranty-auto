import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase/admin"
import { storeSchema } from "@/lib/schemas"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || !["admin", "supervisor"].includes(session.role)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const snapshot = await adminDb.collection("stores").where("tenantId", "==", session.tenantId).get()

    const stores = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(stores)
  } catch (error) {
    console.error("Error fetching stores:", error)
    return NextResponse.json({ error: "Erro ao buscar lojas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const validation = storeSchema.omit({ id: true }).safeParse({
      ...body,
      tenantId: session.tenantId,
    })

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const storeData = {
      ...validation.data,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: session.uid,
    }

    const docRef = await adminDb.collection("stores").add(storeData)

    return NextResponse.json({ id: docRef.id, ...storeData })
  } catch (error) {
    console.error("Error creating store:", error)
    return NextResponse.json({ error: "Erro ao criar loja" }, { status: 500 })
  }
}
