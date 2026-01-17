export interface ErpStore {
  id: number
  nomeFantasia: string
}

export interface ErpStoreListResponse {
  data: ErpStore[]
}

export interface ErpSalesItemsParams {
  nfeId: number
  lojaId: number
}

export interface ErpSaleItem {
  dataEmissao: string
  codigoProduto: string | null
  descricao: string | null
  referencia: string | null
  quantidade: number | null
  produtoId?: number | null
  marca?: string | null
}

export interface ErpSaleItemsResponse {
  nfeId: number
  lojaId: number
  items: ErpSaleItem[]
}
