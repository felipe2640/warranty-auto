# Troubleshooting

## FIREBASE_SERVICE_ACCOUNT_JSON not set
- Configure a env var na Vercel e local.
- Use JSON em uma linha com `\n` no `private_key`.

## private_key com quebra errada
- Certifique-se de usar `\n` na string do JSON.

## Drive folder não compartilhada
- Compartilhe `driveRootFolderId` com o email da service account.

## Permissões insuficientes
- Verifique `role` do usuário em `users`.

## Índices Firestore faltando
- Execute a query e use o link de criação automática do console.

## Datas aparecendo -1 dia (timezone)
- Este projeto usa datas "date-only" (YYYY-MM-DD) para `nextActionAt`, `dueDate`, `dataVenda`, `dataRecebendoPeca`, `dataIndoFornecedor`.
- Se houver dados antigos salvos como Timestamp/Date, rode a migração:
  - `node scripts/migrate-date-only.js`
- Depois disso, os filtros de Agenda e SLA passam a comparar strings (sem shift de timezone).

## build: module-not-found no Linux
- Verifique nomes de arquivos vs imports (case-sensitive).
- Evite client importar módulo server-only (use `lib/types/*`).
