import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { query } from "@/lib/erp/mysql"
import type { ErpProductLookup, ErpProductLookupResponse } from "@/lib/erp/types"

type ErpProductRow = {
  produto_id: number | null
  codigo_produto: string | null
  descricao: string | null
  referencia: string | null
  marca: string | null
}

const PRODUCT_LOOKUP_QUERY = `
  -- CHG-20250929-14: lookup product by code
  WITH fab_principal AS (
    SELECT
      fp.produto,
      fp.fabricante,
      fp.reffabrica,
      fp.marca,
      ROW_NUMBER() OVER (
        PARTITION BY fp.produto
        ORDER BY
          CASE
            WHEN fp.seq_fabricante_produto = pro.primeiro_fabricante_produto THEN 0
            ELSE 1
          END,
          COALESCE(fp.is_principal, 0) DESC,
          fp.seq_fabricante_produto
      ) AS rn
    FROM fabricante_produto AS fp
    INNER JOIN produto AS pro
      ON pro.seq_produto = fp.produto
  )
  SELECT
    pro.seq_produto AS produto_id,
    pro.codigo_produto AS codigo_produto,
    pro.descricao AS descricao,
    fab.reffabrica AS referencia,
    COALESCE(fab_nome.nome, fab.marca) AS marca
  FROM produto AS pro
  LEFT JOIN fab_principal AS fab
    ON fab.produto = pro.seq_produto AND fab.rn = 1
  LEFT JOIN fabricante AS fab_nome
    ON fab_nome.id = fab.fabricante
  WHERE pro.codigo_produto = ?
  LIMIT 1
`

export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  try {
    await requireSession()
    const { codigo } = await params
    const codigoProduto = codigo?.trim()

    if (!codigoProduto) {
      return NextResponse.json({ error: "codigo inválido." }, { status: 400 })
    }

    const rows = await query<ErpProductRow>(PRODUCT_LOOKUP_QUERY, [codigoProduto])
    const row = rows[0]

    if (!row) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 })
    }

    const produto: ErpProductLookup = {
      produtoId: row.produto_id !== null && row.produto_id !== undefined ? Number(row.produto_id) : null,
      codigoProduto: row.codigo_produto ?? null,
      descricao: row.descricao ?? null,
      referencia: row.referencia ?? null,
      marca: row.marca ?? null,
    }

    const response: ErpProductLookupResponse = { produto }
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error && error.message === "Nao autorizado") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : "Erro ao consultar produto no ERP"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
