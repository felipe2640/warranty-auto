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

## build: module-not-found no Linux
- Verifique nomes de arquivos vs imports (case-sensitive).
- Evite client importar módulo server-only (use `lib/types/*`).
