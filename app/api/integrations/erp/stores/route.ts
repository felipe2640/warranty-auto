import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import type { ErpStoreListResponse } from "@/lib/erp/types"
import { fetchErpStores } from "@/lib/erp/stores"

export async function GET() {
  try {
    await requireSession()
    const data = await fetchErpStores()
    const response: ErpStoreListResponse = { data }
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error && error.message === "Nao autorizado") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : "Erro ao consultar lojas no ERP"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
