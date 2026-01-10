import { initializeApp, getApps, cert, type ServiceAccount, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getRequiredEnv } from "@/lib/env"

type FirebaseAdminGlobal = typeof globalThis & {
  __firebaseAdminApp?: App
  __firebaseAdminAuth?: Auth
  __firebaseAdminDb?: Firestore
}

const firebaseAdminGlobal = globalThis as FirebaseAdminGlobal

function getServiceAccount(): ServiceAccount {
  const serviceAccountJson = getRequiredEnv("FIREBASE_SERVICE_ACCOUNT_JSON")
  return JSON.parse(serviceAccountJson) as ServiceAccount
}

export function getAdminApp(): App {
  if (firebaseAdminGlobal.__firebaseAdminApp) {
    return firebaseAdminGlobal.__firebaseAdminApp
  }

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert(getServiceAccount()),
        })

  firebaseAdminGlobal.__firebaseAdminApp = app
  return app
}

export function getAdminAuth(): Auth {
  if (!firebaseAdminGlobal.__firebaseAdminAuth) {
    firebaseAdminGlobal.__firebaseAdminAuth = getAuth(getAdminApp())
  }
  return firebaseAdminGlobal.__firebaseAdminAuth
}

export function getAdminDb(): Firestore {
  if (!firebaseAdminGlobal.__firebaseAdminDb) {
    firebaseAdminGlobal.__firebaseAdminDb = getFirestore(getAdminApp())
  }
  return firebaseAdminGlobal.__firebaseAdminDb
}

// Session cookie management
export async function createSessionCookie(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
  return getAdminAuth().createSessionCookie(idToken, { expiresIn })
}

export async function verifySessionCookie(sessionCookie: string) {
  return getAdminAuth().verifySessionCookie(sessionCookie, true)
}

export async function revokeSession(sessionCookie: string) {
  const decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie)
  return getAdminAuth().revokeRefreshTokens(decodedClaims.sub)
}
