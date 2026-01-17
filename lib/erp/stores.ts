import { query } from "@/lib/erp/mysql"
import type { ErpStore } from "@/lib/erp/types"

type ErpStoreRow = {
  id_loja: number
  nome_fantasia: string
}

const STORES_QUERY = `
  SELECT
    id_loja,
    nome_fantasia
  FROM business.loja
  WHERE inativo = 0
  ORDER BY nome_fantasia
`

export async function fetchErpStores(): Promise<ErpStore[]> {
  const rows = await query<ErpStoreRow>(STORES_QUERY)
  return rows.map((row) => ({
    id: Number(row.id_loja),
    nomeFantasia: row.nome_fantasia,
  }))
}
