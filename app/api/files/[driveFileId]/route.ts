import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getFileStream, getFileMetadata } from "@/lib/drive/client"

export async function GET(request: Request, { params }: { params: Promise<{ driveFileId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { driveFileId } = await params

    // Get file metadata
    const metadata = await getFileMetadata(driveFileId)

    // Stream file from Drive
    const stream = await getFileStream(driveFileId)

    // Create response with proper headers
    const headers = new Headers()
    headers.set("Content-Type", metadata.mimeType || "application/octet-stream")
    headers.set("Content-Disposition", `inline; filename="${metadata.name}"`)
    if (metadata.size) {
      headers.set("Content-Length", metadata.size.toString())
    }

    // @ts-expect-error - stream is compatible with ReadableStream
    return new Response(stream, { headers })
  } catch (error) {
    console.error("File fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch file" }, { status: 500 })
  }
}
