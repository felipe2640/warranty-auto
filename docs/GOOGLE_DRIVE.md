# Google Drive

## Organização dos arquivos
- Cada ticket cria uma pasta no Drive.
- Anexos são enviados para a pasta do ticket.

## Categorias de anexos
Conforme `AttachmentCategoryEnum`:
- `FOTO_PECA`
- `CUPOM_FISCAL`
- `CERTIFICADO_GARANTIA`
- `NOTA_GARANTIA`
- `CANHOTO`
- `OUTRO`
- `ASSINATURA`

## Service Account
- Configure `GOOGLE_SERVICE_ACCOUNT_JSON`.
- Compartilhe a pasta `driveRootFolderId` do tenant com o email da service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL`) como **Editor**.

## Proxy de download
- Downloads passam por `/api/files/[driveFileId]`.
- O backend valida sessão e tenant antes de liberar o stream.
