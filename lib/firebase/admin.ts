import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

function getServiceAccount(): ServiceAccount {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set")
  }
  return JSON.parse(serviceAccountJson) as ServiceAccount
}

// Initialize Firebase Admin (singleton pattern)
const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(getServiceAccount()),
      })

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)

// Session cookie management
export async function createSessionCookie(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
  return adminAuth.createSessionCookie(idToken, { expiresIn })
}

export async function verifySessionCookie(sessionCookie: string) {
  return adminAuth.verifySessionCookie(sessionCookie, true)
}

export async function revokeSession(sessionCookie: string) {
  const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie)
  return adminAuth.revokeRefreshTokens(decodedClaims.sub)
}
