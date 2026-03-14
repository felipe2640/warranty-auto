import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { getUserPermissions } from "@/lib/permissions"
import { onlyDigits } from "@/lib/format"
import { createSupplier, getSupplierByErpId, listSuppliers, updateSupplier } from "@/lib/repositories/admin"
import { buildSupplierErpSyncPatch, findLocalSupplierMatch } from "@/lib/suppliers/erp-matching"

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const permissions = getUserPermissions(session.role)
    if (!permissions.canDefineSupplier) {
      return NextResponse.json({ error: "Permissao negada" }, { status: 403 })
    }

    const body = (await request.json().catch(() => null)) as
      | {
          erpSupplierId?: string
          name?: string
          cnpj?: string
          phone?: string
          email?: string
          slaDays?: number | string
        }
      | null

    const erpSupplierId = typeof body?.erpSupplierId === "string" ? body.erpSupplierId.trim() : ""
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const cnpj = typeof body?.cnpj === "string" ? onlyDigits(body.cnpj).slice(0, 14) : undefined
    const phone = typeof body?.phone === "string" ? onlyDigits(body.phone).slice(0, 11) : undefined
    const email = typeof body?.email === "string" ? body.email.trim() || undefined : undefined
    const slaDays =
      typeof body?.slaDays === "string" ? Number.parseInt(body.slaDays, 10) : body?.slaDays

    if (!erpSupplierId || !name) {
      return NextResponse.json({ error: "Fornecedor ERP inválido" }, { status: 400 })
    }

    const existingSupplier = await getSupplierByErpId(session.tenantId, erpSupplierId)
    if (existingSupplier) {
      const syncPatch = buildSupplierErpSyncPatch(existingSupplier, {
        id: erpSupplierId,
        name,
        cnpj,
        phone,
        email,
      })

      if (Object.keys(syncPatch).length > 0) {
        await updateSupplier(existingSupplier.id, syncPatch)
      }

      return NextResponse.json({
        supplier: {
          ...existingSupplier,
          ...syncPatch,
          updatedAt: Object.keys(syncPatch).length > 0 ? new Date().toISOString() : existingSupplier.updatedAt,
        },
        created: false,
      })
    }

    const matchedSupplier = findLocalSupplierMatch(await listSuppliers(session.tenantId), {
      id: erpSupplierId,
      name,
      cnpj,
    })

    if (matchedSupplier.supplier) {
      const syncPatch = buildSupplierErpSyncPatch(matchedSupplier.supplier, {
        id: erpSupplierId,
        name,
        cnpj,
        phone,
        email,
      })

      if (Object.keys(syncPatch).length > 0) {
        await updateSupplier(matchedSupplier.supplier.id, syncPatch)
      }

      return NextResponse.json({
        supplier: {
          ...matchedSupplier.supplier,
          ...syncPatch,
          updatedAt: Object.keys(syncPatch).length > 0 ? new Date().toISOString() : matchedSupplier.supplier.updatedAt,
        },
        created: false,
      })
    }

    if (!Number.isInteger(slaDays) || Number(slaDays) < 1) {
      return NextResponse.json({ error: "SLA é obrigatório" }, { status: 400 })
    }

    const supplierId = await createSupplier({
      name,
      slaDays: Number(slaDays),
      erpSupplierId,
      cnpj,
      phone,
      email,
      tenantId: session.tenantId,
      active: true,
    })

    return NextResponse.json({
      created: true,
      supplier: {
        id: supplierId,
        name,
        slaDays: Number(slaDays),
        erpSupplierId,
        cnpj,
        phone,
        email,
        tenantId: session.tenantId,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Resolve supplier from ERP error:", error)
    return NextResponse.json({ error: "Erro ao resolver fornecedor ERP" }, { status: 500 })
  }
}
