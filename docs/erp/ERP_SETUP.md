# ERP — Setup & Testes

## Variáveis de ambiente (.env.local)

```
ERP_DB_HOST=127.0.0.1
ERP_DB_PORT=3306
ERP_DB_USER=erp_user
ERP_DB_PASSWORD=erp_password
ERP_DB_NAME=erp_database
```

## Rodar local

```bash
pnpm install
pnpm dev
```

> **Nota:** as rotas de ERP exigem sessão válida (cookie). Faça login na aplicação antes de testar os endpoints.

## Testar endpoints (cURL)

### GET lojas do ERP

Endpoint atual:

```bash
curl -X GET "http://localhost:3000/api/integrations/erp/stores"
```

### GET itens de venda por NFC-e

```bash
curl -X GET "http://localhost:3000/api/integrations/erp/sales/<NFE_ID>/items?loja_id=<STORE_ID>"
```

### POST criar ticket (WARRANTY_STORE sem cliente)

```bash
curl -X POST "http://localhost:3000/api/tickets" \
  -F tenantSlug="<TENANT_SLUG>" \
  -F ticketType="WARRANTY_STORE" \
  -F erpStoreId="<ERP_STORE_ID>" \
  -F numeroVendaOuCfe="<NUM_VENDA_OU_CFE>" \
  -F descricaoPeca="<DESCRICAO>" \
  -F quantidade="1" \
  -F defeitoPeca="<DEFEITO>" \
  -F dataVenda="2025-01-31" \
  -F dataRecebendoPeca="2025-02-01" \
  -F signatureDataUrl="data:image/png;base64,<BASE64>"
```

> Para anexos adicionais, use `-F attachments=@/caminho/arquivo` e `-F attachmentCategories=OUTRO`.
