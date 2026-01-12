import { cookies } from "next/headers"
import { getAdminAuth, getAdminDb } from "./firebase/admin"
import type { User } from "./schemas"
import type { Role } from "./roles"

const SESSION_COOKIE_NAME = "session"

export type SessionUser = User & { uid: string; role: Role }

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionCookie) {
    return null
  }

  try {
    const decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true)

    // Get user data from Firestore
    const userDoc = await getAdminDb().collection("users").doc(decodedClaims.uid).get()

    if (!userDoc.exists) {
      return null
    }

    const userData = userDoc.data()

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
      ...userData,
    } as SessionUser
  } catch {
    return null
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error("Nao autorizado")
  }
  return session
}

export async function requireTenantSession(tenantSlug: string) {
  const session = await requireSession()

  // Verify user belongs to this tenant
  const tenantDoc = await getAdminDb().collection("tenants").where("slug", "==", tenantSlug).limit(1).get()

  if (tenantDoc.empty) {
    throw new Error("Tenant nao encontrado")
  }

  const tenant = tenantDoc.docs[0]
  const tenantData = tenant.data()
  const tenantName = typeof tenantData?.name === "string" && tenantData.name.trim() ? tenantData.name.trim() : tenantSlug

  if (session.tenantId !== tenant.id) {
    throw new Error("Acesso negado a este tenant")
  }

  return { session, tenantId: tenant.id, tenantSlug, tenantName }
}

export async function requireAuth(): Promise<SessionUser> {
  return requireSession()
}

export async function getServerSession(): Promise<SessionUser | null> {
  return getSession()
}
