import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSessionCookie, getAdminAuth, getAdminDb } from "@/lib/firebase/admin"
import { ADMIN_ROLE } from "@/lib/roles"

const DEFAULT_POLICIES = {
  recebedorOnlyOwnStore: true,
  requireCanhotForCobranca: true,
  allowCloseWithoutResolution: false,
  defaultSlaDays: 30,
}

export async function POST(request: Request) {
  try {
    const { idToken, tenant } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "idToken não informado" }, { status: 400 })
    }

    if (!tenant || typeof tenant !== "string" || !tenant.trim()) {
      return NextResponse.json({ error: "Tenant não informado" }, { status: 400 })
    }

    const tenantSlug = tenant.trim()
    const decoded = await getAdminAuth().verifyIdToken(idToken)

    if (!decoded.email) {
      return NextResponse.json({ error: "Email não disponível no token" }, { status: 400 })
    }

    const db = getAdminDb()
    const tenantSnapshot = await db.collection("tenants").where("slug", "==", tenantSlug).limit(1).get()

    let tenantId = ""
    if (tenantSnapshot.empty) {
      const hasAnyTenant = !(await db.collection("tenants").limit(1).get()).empty

      if (hasAnyTenant) {
        return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 })
      }

      const now = new Date()
      const tenantRef = db.collection("tenants").doc(tenantSlug)

      await tenantRef.set({
        slug: tenantSlug,
        name: tenantSlug,
        driveRootFolderId: null,
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
        policies: DEFAULT_POLICIES,
        createdAt: now,
        updatedAt: now,
      })

      tenantId = tenantRef.id
    } else {
      tenantId = tenantSnapshot.docs[0].id
    }

    const userRef = db.collection("users").doc(decoded.uid)
    const userSnapshot = await userRef.get()

    if (userSnapshot.exists) {
      const userData = userSnapshot.data()
      if (userData?.tenantId !== tenantId) {
        return NextResponse.json({ error: "Usuário não pertence a este tenant" }, { status: 403 })
      }
    } else {
      const hasUsers = !(await db.collection("users").where("tenantId", "==", tenantId).limit(1).get()).empty
      if (hasUsers) {
        return NextResponse.json({ error: "Usuário não cadastrado para este tenant" }, { status: 403 })
      }

      const now = new Date()
      const name = decoded.name || decoded.email.split("@")[0] || "Admin"
      const userData = {
        email: decoded.email,
        name,
        role: ADMIN_ROLE,
        tenantId,
        active: true,
        createdAt: now,
        updatedAt: now,
      }

      await userRef.set(userData)
      await getAdminAuth().setCustomUserClaims(decoded.uid, { tenantId, role: ADMIN_ROLE })
    }

    const sessionCookie = await createSessionCookie(idToken)

    const cookieStore = await cookies()
    cookieStore.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5, // 5 days
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Session creation error:", error)
    return NextResponse.json({ error: "Falha ao criar sessão" }, { status: 401 })
  }
}
