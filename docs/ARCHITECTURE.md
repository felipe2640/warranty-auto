# Architecture

## Diagrama (texto)
```
UI (App Router / Client)
  -> API Routes (app/api/*)
    -> Services (lib/services/*)
      -> Repositories (lib/repositories/*)
        -> Firestore / Google Drive
```

## Camadas
### UI
- Pages e Client Components em `app/` e `components/`.
- Consomem API routes e exibem checklist/stepper/tabs.

### Services
- `lib/services/warrantyService.ts`
  - Criação de ticket (`createTicketWithUploads`).
  - Detalhes do ticket (`fetchTicketDetail`).
  - Checklist de transição e `stageSummaryMap`.
- `lib/services/adminService.ts`
  - Usuários, lojas, fornecedores e settings.
  - Auditoria (collectionGroup).

### Repositories
- `lib/repositories/tickets.ts`
  - CRUD, timeline, audit, attachments.
  - Paginação, filtros e `searchTokens`.
- `lib/repositories/admin.ts`
  - Users, stores, suppliers, tenants.

### Sessão e Auth
- `lib/session.ts` usa session cookie e Firebase Admin para validar.

### Search Tokens
- `lib/search.ts` gera tokens normalizados para `array-contains`.

## Evitar client importar server-only
- Tipos compartilhados ficam em `lib/types/*`.
- Client components não importam `lib/services/*` diretamente.
