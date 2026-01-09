import { NextResponse } from "next/server"
import { requireTenantSession } from "@/lib/session"
import { createTicket, listTickets } from "@/lib/repositories/tickets"
import { getTenantSettings, listStores } from "@/lib/repositories/admin"
import { addAttachment } from "@/lib/repositories/tickets"
import { getUserPermissions } from "@/lib/permissions"
import type { Status } from "@/lib/schemas"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const tenantSlug = formData.get("tenantSlug") as string

    const { session, tenantId } = await requireTenantSession(tenantSlug)
    const permissions = getUserPermissions(session.role)

    if (!permissions.canCreateTicket) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const tenantSettings = await getTenantSettings(tenantId)

    if (!tenantSettings?.driveRootFolderId) {
      return NextResponse.json({ error: "Drive folder not configured" }, { status: 400 })
    }

    // Parse form data
    const ticketData = {
      tenantId,
      storeId: formData.get("storeId") as string,
      nfIda: (formData.get("nfIda") as string) || undefined,
      nfRetorno: (formData.get("nfRetorno") as string) || undefined,
      boletoComAbatimento: (formData.get("boletoComAbatimento") as string) || undefined,
      remessa: (formData.get("remessa") as string) || undefined,
      retorno: (formData.get("retorno") as string) || undefined,
      nomeRazaoSocial: formData.get("nomeRazaoSocial") as string,
      nomeFantasiaApelido: (formData.get("nomeFantasiaApelido") as string) || undefined,
      cpfCnpj: (formData.get("cpfCnpj") as string).replace(/\D/g, ""),
      celular: (formData.get("celular") as string).replace(/\D/g, ""),
      isWhatsapp: formData.get("isWhatsapp") === "true",
      descricaoPeca: formData.get("descricaoPeca") as string,
      quantidade: Number.parseInt(formData.get("quantidade") as string, 10),
      ref: (formData.get("ref") as string) || undefined,
      codigo: (formData.get("codigo") as string) || undefined,
      defeitoPeca: formData.get("defeitoPeca") as string,
      numeroVendaOuCfe: formData.get("numeroVendaOuCfe") as string,
      numeroVendaOuCfeFornecedor: (formData.get("numeroVendaOuCfeFornecedor") as string) || undefined,
      dataVenda: new Date(formData.get("dataVenda") as string),
      dataRecebendoPeca: new Date(formData.get("dataRecebendoPeca") as string),
      dataIndoFornecedor: formData.get("dataIndoFornecedor")
        ? new Date(formData.get("dataIndoFornecedor") as string)
        : undefined,
      obs: (formData.get("obs") as string) || undefined,
      createdBy: session.uid,
    }

    // Create ticket
    const ticketId = await createTicket(ticketData, tenantSettings.driveRootFolderId, session.uid, session.name)

    // Handle signature upload
    const signatureDataUrl = formData.get("signatureDataUrl") as string
    if (signatureDataUrl) {
      const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, "")
      const signatureBuffer = Buffer.from(base64Data, "base64")

      await addAttachment(ticketId, signatureBuffer, {
        name: `assinatura_${ticketId}.png`,
        mimeType: "image/png",
        size: signatureBuffer.length,
        category: "ASSINATURA",
        uploadedBy: session.uid,
        uploadedByName: session.name,
      })
    }

    // Handle file attachments
    const attachmentEntries = formData.getAll("attachments")
    const categoryEntries = formData.getAll("attachmentCategories")

    for (let i = 0; i < attachmentEntries.length; i++) {
      const file = attachmentEntries[i] as File
      const category = (categoryEntries[i] as string) || "OUTRO"

      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer())

        await addAttachment(ticketId, buffer, {
          name: file.name,
          mimeType: file.type,
          size: file.size,
          category,
          uploadedBy: session.uid,
          uploadedByName: session.name,
        })
      }
    }

    return NextResponse.json({ success: true, ticketId })
  } catch (error) {
    console.error("Create ticket error:", error)
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantSlug = searchParams.get("tenant")

    if (!tenantSlug) {
      return NextResponse.json({ error: "Tenant is required" }, { status: 400 })
    }

    const { session, tenantId } = await requireTenantSession(tenantSlug)

    // Build filter options
    const options = {
      tenantId,
      status: searchParams.get("status") as Status | undefined,
      storeId: searchParams.get("storeId") || undefined,
      supplierId: searchParams.get("supplierId") || undefined,
      search: searchParams.get("search") || undefined,
      onlyOverdue: searchParams.get("onlyOverdue") === "true",
      onlyActionToday: searchParams.get("onlyActionToday") === "true",
      limit: searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")!, 10) : 20,
      startAfter: searchParams.get("cursor") || undefined,
    }

    // If user is RECEBEDOR and policy requires, filter by their store
    const tenantSettings = await getTenantSettings(tenantId)
    if (session.role === "RECEBEDOR" && tenantSettings?.policies.recebedorOnlyOwnStore && session.storeId) {
      options.storeId = session.storeId
    }

    const result = await listTickets(options)

    // Get store names for display
    const stores = await listStores(tenantId)
    const storeMap = new Map(stores.map((s) => [s.id, s.name]))

    const ticketsWithStoreNames = result.tickets.map((ticket) => ({
      ...ticket,
      storeName: storeMap.get(ticket.storeId) || "—",
    }))

    return NextResponse.json({
      tickets: ticketsWithStoreNames,
      nextCursor: result.nextCursor,
    })
  } catch (error) {
    console.error("List tickets error:", error)
    return NextResponse.json({ error: "Failed to list tickets" }, { status: 500 })
  }
}
