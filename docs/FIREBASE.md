# Firebase

## Firebase Client
- Inicialização via SDK web em `lib/firebase/client.ts`.
- Auth com email/senha.

## Firebase Admin
- Inicialização lazy via `getAdminApp/getAdminAuth/getAdminDb`.
- `FIREBASE_SERVICE_ACCOUNT_JSON` é validado apenas quando necessário.

## Session cookie
- Login gera session cookie via `app/api/auth/session`.
- Cookie é lido em `lib/session.ts` para autenticação server-side.
- Logout via `/api/auth/logout`.

## Firestore
- Acesso server-side (Admin SDK) para queries por tenant.
- Coleções principais: tenants, users, stores, suppliers, tickets (timeline/attachments/audit).
