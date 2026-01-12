import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { revokeSession } from "@/lib/firebase/admin"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")?.value

    if (sessionCookie) {
      await revokeSession(sessionCookie).catch(() => {
        // Ignore errors if session is already invalid
      })
    }

    cookieStore.delete("session")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Falha ao sair" }, { status: 500 })
  }
}
