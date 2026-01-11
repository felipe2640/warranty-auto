# Setup (Local)

## 1) Pré-requisitos
- Node.js + pnpm
- Projeto Firebase (Auth + Firestore)
- Projeto Google Cloud com Drive API habilitada

## 2) Firebase (client + admin)
### Criar projeto
1. Crie um projeto no Firebase Console.
2. Habilite **Authentication → Email/Password**.
3. Crie um App Web e copie as chaves do SDK.

### Service account (Admin SDK)
1. Vá em **Project Settings → Service accounts**.
2. Gere o JSON da service account.
3. Preencha `FIREBASE_SERVICE_ACCOUNT_JSON` no `.env.local`.

### Variáveis obrigatórias
Preencha as variáveis em `.env.local` com base em `.env.example`:
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `NEXT_PUBLIC_FIREBASE_*`

### Usuário ADMIN inicial
Opção A (automático no primeiro login):
1. Crie um usuário no Firebase Auth (email/senha).
2. Acesse `/t/<slug>/login` e faça login.
3. Se não existir tenant e não houver usuários para ele, o sistema cria o tenant e o primeiro usuário `ADMIN` automaticamente.

Opção B (manual):
- Crie um usuário com `role = "ADMIN"` em `users` e `tenantId` válido.

## 3) Firestore
### Estrutura de coleções
- `tenants`
- `users`
- `stores`
- `suppliers`
- `tickets`
  - `timeline` (subcoleção)
  - `attachments` (subcoleção)
  - `audit` (subcoleção)

### Índices sugeridos (por consultas usadas)
- `tickets`: `tenantId + createdAt`
- `tickets`: `tenantId + status + createdAt`
- `tickets`: `tenantId + storeId + createdAt`
- `tickets`: `tenantId + supplierId + createdAt`
- `tickets`: `tenantId + searchTokens (array-contains) + createdAt`
- `tickets`: `tenantId + isClosed + dueDate`
- `tickets`: `tenantId + nextActionAt`
- `tickets`: `tenantId + nextActionAt + status (in)`

> O Firestore fornece links automáticos para criação de índices ao rodar as queries pela primeira vez.

## 4) Google Drive
1. Habilite a **Drive API** no Google Cloud.
2. Crie uma service account e gere o JSON.
3. Preencha `GOOGLE_SERVICE_ACCOUNT_JSON` no `.env.local`.
4. Compartilhe a pasta `driveRootFolderId` do tenant com o `GOOGLE_SERVICE_ACCOUNT_EMAIL` como **Editor**.

Teste a conexão via Admin → Configurações (botão de teste).

## 5) Rodar local
```bash
pnpm install
pnpm dev
```

### Smoke tests manuais
- Login com usuário ADMIN.
- Criar ticket com assinatura e anexos.
- Avançar etapas com checklist.
- Validar agenda (hoje/atrasadas/7 dias).
- Verificar auditoria e download de anexos.
