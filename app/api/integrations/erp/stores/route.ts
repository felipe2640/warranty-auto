import { NextResponse } from "next/server"
import { query } from "@/lib/erp/mysql"

type StoreRow = {
  id_loja: number
  nome_fantasia: string
}

export async function GET() {
  try {
    const rows = await query<StoreRow>(
      `
      SELECT
        id_loja,
        nome_fantasia
      FROM business.loja
      WHERE inativo = 0
      ORDER BY nome_fantasia;
    `,
    )

    const data = rows.map((row) => ({
      id: row.id_loja,
      nomeFantasia: row.nome_fantasia,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error("ERP stores fetch failed:", error)
    return NextResponse.json({ error: "Erro ao carregar lojas do ERP." }, { status: 500 })
  }
}
