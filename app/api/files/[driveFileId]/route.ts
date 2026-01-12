import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getFileStream, getFileMetadata } from "@/lib/drive/client"
import { findAttachmentByDriveFileId } from "@/lib/repositories/tickets"
import { RoleEnum } from "@/lib/roles"

export async function GET(request: Request, { params }: { params: Promise<{ driveFileId: string }> }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const roleValidation = RoleEnum.safeParse(session.role)
    if (!roleValidation.success) {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 })
    }

    const { driveFileId } = await params

    const attachment = await findAttachmentByDriveFileId(driveFileId)
    if (!attachment || attachment.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 })
    }

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
    return NextResponse.json({ error: "Erro ao buscar arquivo" }, { status: 500 })
  }
}
