# ERP — Schema Map & Joins

## Tabelas e campos usados

### loja
- `id_loja`
- `nome_fantasia`
- `inativo`

### autoc_nota_fiscal_entity
- `id`
- `ide_nNF`
- `ide_dEmi`
- `loja_entity`

### autoc_item_entity
- `id`
- `id_infNFe`
- `det_prod_cProd`
- `det_prod_xProd`
- `det_prod_qCom`
- `produto_entity`

## Joins finais

- `autoc_nota_fiscal_entity.id` → `autoc_item_entity.id_infNFe`
- `autoc_nota_fiscal_entity.loja_entity` → `loja.id_loja`
- `autoc_item_entity.produto_entity` → `produto.seq_produto` (join via `produto_entity`)

## Observações

- O join com `produto` está baseado no campo `produto_entity` do item, alinhado com a query atual de NFC-e.
- Quando necessário, `codigo_produto`/`det_prod_cProd` pode servir como fallback de exibição para o código do produto.
