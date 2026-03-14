import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { getErpSuppliersByProductCode } from "@/lib/erp/suppliers"
import type { ErpProductSuppliersResponse } from "@/lib/erp/types"

export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  try {
    await requireSession()
    const { codigo } = await params
    const productCode = codigo?.trim()

    if (!productCode) {
      return NextResponse.json({ error: "codigo inválido." }, { status: 400 })
    }

    const result = await getErpSuppliersByProductCode(productCode)
    if (result.suppliers.length === 0) {
      return NextResponse.json({ error: "Nenhum fornecedor ERP encontrado para este produto." }, { status: 404 })
    }

    const response: ErpProductSuppliersResponse = {
      productCode: result.productCode,
      productDescription: result.productDescription,
      suppliers: result.suppliers,
    }

    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error && error.message === "Nao autorizado") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const message = error instanceof Error ? error.message : "Erro ao consultar fornecedores do produto no ERP"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
