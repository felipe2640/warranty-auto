import { toDateOnlyString } from "@/lib/date"
import { query } from "@/lib/erp/mysql"
import type { ErpProductSupplier } from "@/lib/erp/types"

type ErpProductSupplierRow = {
  product_code: string
  product_description: string | null
  erp_supplier_id: number
  supplier_name: string | null
  supplier_cnpj: string | null
  supplier_phone: string | null
  contact_name: string | null
  site: string | null
  is_suggested: number
  has_product_link: number
  last_purchase_date: Date | string | null
}

const PRODUCT_SUPPLIERS_QUERY = `
  WITH produto_alvo AS (
    SELECT
      pro.seq_produto AS produto_id,
      pro.codigo_produto AS product_code,
      pro.descricao AS product_description
    FROM produto AS pro
    WHERE pro.codigo_produto = ?
    LIMIT 1
  ),
  ultima_compra AS (
    SELECT
      nfi.produto_entity AS produto_id,
      nfe.fornecedor_entity AS fornecedor_id,
      nfe.data_chegada AS data_chegada,
      ROW_NUMBER() OVER (
        PARTITION BY nfi.produto_entity
        ORDER BY nfe.data_chegada DESC, nfe.id DESC
      ) AS rn
    FROM nota_fiscal_entrada_item AS nfi
    INNER JOIN nota_fiscal_entrada AS nfe
      ON nfe.id = nfi.nota_fiscal_entrada_entity
  ),
  ultimo_telefone_fornecedor AS (
    SELECT
      tel.fornecedor AS fornecedor_id,
      tel.num_telefone AS phone,
      ROW_NUMBER() OVER (
        PARTITION BY tel.fornecedor
        ORDER BY COALESCE(tel.data_emissao, tel.data_entrada) DESC, tel.seq_telefone DESC
      ) AS rn
    FROM telefone AS tel
    WHERE tel.fornecedor IS NOT NULL
      AND COALESCE(tel.num_telefone, '') <> ''
  ),
  ultimo_fone_xml AS (
    SELECT
      nfe.fornecedor_entity AS fornecedor_id,
      anf.emit_enderEmit_fone AS phone,
      ROW_NUMBER() OVER (
        PARTITION BY nfe.fornecedor_entity
        ORDER BY nfe.data_chegada DESC, nfe.id DESC
      ) AS rn
    FROM nota_fiscal_entrada AS nfe
    INNER JOIN autoc_nota_fiscal_entity AS anf
      ON anf.id = nfe.autoc_nota_fiscal_entity
    WHERE nfe.fornecedor_entity IS NOT NULL
      AND COALESCE(anf.emit_enderEmit_fone, '') <> ''
  ),
  fornecedores_produto AS (
    SELECT
      pa.produto_id,
      pa.product_code,
      pa.product_description,
      pf.fornecedor_entity AS fornecedor_id,
      1 AS has_product_link,
      0 AS is_suggested
    FROM produto_alvo AS pa
    INNER JOIN produto_fornecedor AS pf
      ON pf.produto_entity = pa.produto_id
  ),
  fornecedor_ultima_compra AS (
    SELECT
      pa.produto_id,
      pa.product_code,
      pa.product_description,
      uc.fornecedor_id,
      0 AS has_product_link,
      1 AS is_suggested
    FROM produto_alvo AS pa
    INNER JOIN ultima_compra AS uc
      ON uc.produto_id = pa.produto_id
     AND uc.rn = 1
  ),
  fornecedores_candidatos AS (
    SELECT * FROM fornecedores_produto
    UNION ALL
    SELECT * FROM fornecedor_ultima_compra
  )
  SELECT
    fc.product_code,
    fc.product_description,
    forn.id AS erp_supplier_id,
    forn.nome AS supplier_name,
    forn.cpf_cnpj AS supplier_cnpj,
    COALESCE(utf.phone, ufx.phone) AS supplier_phone,
    forn.pessoa_contato AS contact_name,
    forn.site AS site,
    MAX(fc.is_suggested) AS is_suggested,
    MAX(fc.has_product_link) AS has_product_link,
    MAX(CASE WHEN uc.fornecedor_id = forn.id THEN uc.data_chegada ELSE NULL END) AS last_purchase_date
  FROM fornecedores_candidatos AS fc
  INNER JOIN fornecedor AS forn
    ON forn.id = fc.fornecedor_id
  LEFT JOIN ultima_compra AS uc
    ON uc.produto_id = fc.produto_id
   AND uc.rn = 1
  LEFT JOIN ultimo_telefone_fornecedor AS utf
    ON utf.fornecedor_id = forn.id
   AND utf.rn = 1
  LEFT JOIN ultimo_fone_xml AS ufx
    ON ufx.fornecedor_id = forn.id
   AND ufx.rn = 1
  WHERE forn.nome IS NOT NULL
    AND COALESCE(forn.inativo, 0) = 0
  GROUP BY
    fc.product_code,
    fc.product_description,
    forn.id,
    forn.nome,
    forn.cpf_cnpj,
    utf.phone,
    ufx.phone,
    forn.pessoa_contato,
    forn.site
  ORDER BY
    is_suggested DESC,
    has_product_link DESC,
    forn.nome ASC
`

export async function getErpSuppliersByProductCode(productCode: string): Promise<{
  productCode: string
  productDescription?: string | null
  suppliers: ErpProductSupplier[]
}> {
  const trimmedCode = productCode.trim()
  if (!trimmedCode) {
    return {
      productCode: "",
      productDescription: null,
      suppliers: [],
    }
  }

  const rows = await query<ErpProductSupplierRow>(PRODUCT_SUPPLIERS_QUERY, [trimmedCode])
  if (rows.length === 0) {
    return {
      productCode: trimmedCode,
      productDescription: null,
      suppliers: [],
    }
  }

  return {
    productCode: rows[0].product_code,
    productDescription: rows[0].product_description ?? null,
    suppliers: rows.map((row) => ({
      id: String(row.erp_supplier_id),
      name: row.supplier_name ?? "",
      cnpj: row.supplier_cnpj ?? null,
      phone: row.supplier_phone ?? null,
      contactName: row.contact_name ?? null,
      site: row.site ?? null,
      isSuggested: Boolean(row.is_suggested),
      hasProductLink: Boolean(row.has_product_link),
      lastPurchaseDate: row.last_purchase_date ? toDateOnlyString(row.last_purchase_date) : null,
    })),
  }
}
