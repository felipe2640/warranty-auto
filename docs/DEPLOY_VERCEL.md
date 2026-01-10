# Deploy na Vercel

## Passo a passo
1. Conecte o repositório na Vercel.
2. Configure as variáveis de ambiente (Production e Preview).
3. Faça o deploy.

## Variáveis de ambiente
Use `.env.example` como referência completa.
- Firebase Admin: `FIREBASE_SERVICE_ACCOUNT_JSON`
- Firebase Client: `NEXT_PUBLIC_FIREBASE_*`
- Google Drive: `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`

### Dicas para JSON
- Use string em uma linha, com `\n` no `private_key`.
- Não faça log do conteúdo do JSON.

## Checklist pós-deploy
- Login com ADMIN.
- Criar ticket com assinatura e anexos (PDF + imagem).
- Avançar etapas com checklist.
- Agenda (hoje/atrasadas/7 dias).
- Auditoria admin (`/api/admin/audit`).
- Download via `/api/files/[driveFileId]`.

## Troubleshooting de build
- **FIREBASE_SERVICE_ACCOUNT_JSON not set**
  - Certifique-se de configurar a env var na Vercel.
  - Firebase Admin inicializa apenas em runtime.
- **Case-sensitive import**
  - Verifique se o nome do arquivo bate com o import.
- **Alias @/**
  - O projeto usa `@/*` → `./*`.
