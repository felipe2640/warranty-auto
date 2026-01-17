import { NextResponse } from "next/server"
import { requireSession } from "@/lib/session"
import { query } from "@/lib/erp/mysql"
import type { ErpSaleItem, ErpSaleItemsResponse } from "@/lib/erp/types"
import { toDateOnlyString } from "@/lib/date"

type ErpSaleItemRow = {
  data_emissao: Date | string | null
  codigo_venda: string | null
  codigo_produto: string | null
  descricao: string | null
  referencia: string | null
  quantidade: number | null
  produto_id: number | null
  marca: string | null
}

const SALES_ITEMS_QUERY = `
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
    nfe.ide_dEmi AS data_emissao,
    item.det_prod_cProd AS codigo_venda,
    COALESCE(pro.codigo_produto, item.codigo_produto) AS codigo_produto,
    COALESCE(pro.descricao, item.det_prod_xProd) AS descricao,
    COALESCE(fab.reffabrica, item.reffabrica) AS referencia,
    item.det_prod_qCom AS quantidade,
    pro.seq_produto AS produto_id,
    COALESCE(fab_nome.nome, fab.marca) AS marca
  FROM autoc_nota_fiscal_entity AS nfe
  JOIN autoc_item_entity AS item
    ON item.id_infNFe = nfe.id
  LEFT JOIN produto AS pro
    ON pro.seq_produto = item.produto_entity
  LEFT JOIN fab_principal AS fab
    ON fab.produto = pro.seq_produto AND fab.rn = 1
  LEFT JOIN fabricante AS fab_nome
    ON fab_nome.id = fab.fabricante
  WHERE nfe.ide_nNF = ?
    AND nfe.loja_entity = ?
  ORDER BY item.det_prod_nItem
`

function parseIntParam(raw: string): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isInteger(parsed) ? parsed : null
}

export async function GET(request: Request, { params }: { params: Promise<{ nfe_id: string }> }) {
  try {
    await requireSession()
    const { nfe_id } = await params
    const nfeId = parseIntParam(nfe_id)

    const { searchParams } = new URL(request.url)
    const lojaIdRaw =
      searchParams.get("loja_id") ||
      searchParams.get("storeId") ||
      searchParams.get("lojaId") ||
      searchParams.get("id_loja")
    const lojaId = parseIntParam(lojaIdRaw || "")

    if (!nfeId) {
      return NextResponse.json({ error: "nfe_id inválido." }, { status: 400 })
    }

    if (!lojaId) {
      return NextResponse.json({ error: "loja_id inválido." }, { status: 400 })
    }

    const rows = await query<ErpSaleItemRow>(SALES_ITEMS_QUERY, [nfeId, lojaId])

    const items: ErpSaleItem[] = rows.map((row) => {
      const dataEmissao = row.data_emissao ? toDateOnlyString(row.data_emissao) : ""
      const codigoProduto = row.codigo_produto ?? row.codigo_venda ?? null
      const descricao = row.descricao ?? null
      const referencia = row.referencia ?? null
      const quantidade = row.quantidade !== null && row.quantidade !== undefined ? Number(row.quantidade) : null
      const produtoId = row.produto_id !== null && row.produto_id !== undefined ? Number(row.produto_id) : null
      const marca = row.marca ?? null

      return {
        dataEmissao,
        codigoProduto,
        descricao,
        referencia,
        quantidade,
        produtoId,
        marca,
      }
    })

    const response: ErpSaleItemsResponse = { nfeId, lojaId, items }
    return NextResponse.json(response)
  } catch (error) {
    if (error instanceof Error && error.message === "Nao autorizado") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    const message = error instanceof Error ? error.message : "Erro ao consultar itens da NFe"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
