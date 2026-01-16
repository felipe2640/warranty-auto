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

## React Query (client)
- Provider global em `app/providers.tsx` com defaults mobile-friendly:
  - `staleTime: 60s`
  - `retry: 1`
  - `refetchOnWindowFocus: false`
- O `QueryClientProvider` envolve a árvore no root layout (`app/layout.tsx`).

### Uso nos tickets (exemplos)
```tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

// Buscar ticket por ID (ex.: /api/tickets/[id])
const ticketQuery = useQuery({
  queryKey: ["tickets", ticketId],
  queryFn: async () => {
    const response = await fetch(`/api/tickets/${ticketId}`)
    if (!response.ok) {
      throw new Error("Erro ao carregar ticket")
    }
    return response.json()
  },
})

// Atualizar status do ticket (ex.: /api/tickets/[id]/status)
const queryClient = useQueryClient()
const updateStatus = useMutation({
  mutationFn: async (payload: { status: string }) => {
    const response = await fetch(`/api/tickets/${ticketId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error("Erro ao atualizar status")
    }
    return response.json()
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] })
  },
})
```

## Evitar client importar server-only
- Tipos compartilhados ficam em `lib/types/*`.
- Client components não importam `lib/services/*` diretamente.
