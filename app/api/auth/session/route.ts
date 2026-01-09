import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createSessionCookie } from "@/lib/firebase/admin"

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
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
    return NextResponse.json({ error: "Failed to create session" }, { status: 401 })
  }
}
