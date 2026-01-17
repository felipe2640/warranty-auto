import { NextResponse } from "next/server"
import { query } from "@/lib/erp/mysql"

type SaleItemRow = {
  data_emissao: Date | string | null
  codigo_venda: string | null
  codigo_produto: string | null
  descricao: string | null
  referencia: string | null
  quantidade: number | null
  produto_id: number | null
  marca: string | null
}

const SQL_SALES_ITEMS = `
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
  ORDER BY item.det_prod_nItem;
`

function normalizeDate(value: Date | string | null): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export async function GET(_request: Request, context: { params: { nfe_id: string } }) {
  const { nfe_id } = context.params
  const nfeId = Number(nfe_id)

  if (!Number.isInteger(nfeId)) {
    return NextResponse.json({ error: "nfe_id inválido." }, { status: 400 })
  }

  try {
    const rows = await query<SaleItemRow>(SQL_SALES_ITEMS, [nfeId])

    const items = rows.map((row) => ({
      dataEmissao: normalizeDate(row.data_emissao),
      codigoProduto: row.codigo_produto ?? row.codigo_venda,
      descricao: row.descricao,
      referencia: row.referencia,
      quantidade: row.quantidade,
      produtoId: row.produto_id,
      marca: row.marca,
    }))

    return NextResponse.json({ nfeId, items })
  } catch (error) {
    console.error("ERP sale items fetch failed:", error)
    return NextResponse.json({ error: "Erro ao carregar itens da venda." }, { status: 500 })
  }
}
