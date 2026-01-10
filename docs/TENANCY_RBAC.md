# Multi-tenant e RBAC

## Multi-tenant
- Todas as páginas autenticadas ficam sob `/t/[tenant]`.
- O `tenantSlug` é resolvido para `tenantId` via Firestore, e a sessão é validada contra o `tenantId`.
- Todas as queries server-side filtram por `tenantId`.

## Papéis (roles)
Papéis definidos em `lib/roles.ts`:
- `RECEBEDOR`
- `INTERNO`
- `LOGISTICA`
- `COBRANCA`
- `ADMIN`

## Permissões (resumo)
A matriz real está em `lib/permissions.ts`. Resumo:

| Ação | RECEBEDOR | INTERNO | LOGISTICA | COBRANCA | ADMIN |
| --- | --- | --- | --- | --- | --- |
| Criar ticket | ✅ | ❌ | ❌ | ❌ | ✅ |
| Editar recebimento | ✅ | ❌ | ❌ | ❌ | ✅ |
| Definir fornecedor | ❌ | ✅ | ❌ | ❌ | ✅ |
| Registrar logística | ❌ | ❌ | ✅ | ❌ | ✅ |
| Anexar canhoto | ❌ | ❌ | ✅ | ❌ | ✅ |
| Adicionar timeline | ✅ | ✅ | ✅ | ✅ | ✅ |
| Definir próxima ação | ❌ | ❌ | ❌ | ✅ | ✅ |
| Resolver/Encerrar | ❌ | ❌ | ❌ | ✅ | ✅ |
| Reverter etapa | ❌ | ❌ | ❌ | ❌ | ✅ |
| Acessar Admin | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver auditoria | ❌ | ❌ | ❌ | ❌ | ✅ |

## Visibilidade na UI
- O menu de **Admin** aparece apenas para `ADMIN`.
- Botões e ações são renderizados conforme `getUserPermissions(role)`.

## Validação no backend
- API routes validam sessão e verificam permissões antes de alterações.
- Avanço de etapas é validado no backend via checklist/transition rules.
