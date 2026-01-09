import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/session"
import { adminDb, adminAuth } from "@/lib/firebase/admin"
import { userCreateSchema } from "@/lib/schemas"

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const snapshot = await adminDb.collection("users").where("tenantId", "==", session.tenantId).get()

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Erro ao buscar usuários" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 })
    }

    const body = await request.json()
    const validation = userCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 })
    }

    const { email, password, displayName, role, storeIds } = validation.data

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    })

    // Create Firestore user document
    const userData = {
      email,
      displayName,
      role,
      storeIds: storeIds || [],
      tenantId: session.tenantId,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: session.uid,
    }

    await adminDb.collection("users").doc(userRecord.uid).set(userData)

    // Set custom claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      tenantId: session.tenantId,
      role,
    })

    return NextResponse.json({ id: userRecord.uid, ...userData })
  } catch (error) {
    console.error("Error creating user:", error)
    const message = error instanceof Error ? error.message : "Erro ao criar usuário"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
