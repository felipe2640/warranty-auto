# Warranty Auto (SaaS de Garantias)

## Índice
- [Visão geral](#visão-geral)
- [Stack](#stack)
- [Quickstart (local)](#quickstart-local)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Segurança, multi-tenant e RBAC](#segurança-multi-tenant-e-rbac)
- [Performance mobile](#performance-mobile)
- [Documentação detalhada](#documentação-detalhada)

## Visão geral
O sistema gerencia **garantias por etapas** com fluxo guiado, **agenda de cobrança** e **anexos armazenados no Google Drive**. É multi-tenant via rota `/t/[tenant]` e possui RBAC por papéis.

### Principais fluxos
- **Abertura de ticket no balcão (mobile)**: criação de ticket com assinatura e anexos.
- **Avanço de etapas com checklist**: requisitos server-side para avançar (fornecedor, canhoto, resposta, resultado final).
- **Timeline/agenda de cobrança**: ações por data com filtros server-side e paginação.
- **Resolução e encerramento**: registro de resultado (`CREDITO`, `TROCA`, `NEGOU`) e fechamento.
- **Administração**: usuários, lojas, fornecedores, auditoria e configurações do tenant.

## Stack
- **Next.js App Router + TypeScript**: UI e API routes.
- **Firebase Auth + session cookie**: autenticação com cookie de sessão server-side.
- **Firestore**: persistência de dados multi-tenant.
- **Google Drive API (service account)**: anexos e assinatura.
- **Tailwind + shadcn/ui + lucide-react + react-hook-form + zod**: UI e validação.

## Quickstart (local)
1) Instalar dependências:
```bash
pnpm install
```

2) Criar `.env.local` a partir de `.env.example`.

3) Rodar o servidor:
```bash
pnpm dev
```

4) Bootstrap inicial (sem seed manual):
- Crie um usuário no Firebase Auth (email/senha).
- Acesse `/t/<slug>/login` e faça login.
- Se o tenant não existir e não houver usuários para ele, o sistema cria o tenant e o primeiro usuário `ADMIN` automaticamente.

> Detalhes completos em `docs/SETUP.md`.

## Estrutura do repositório
```
app/                    # Rotas Next.js (pages e API)
  api/                 # API routes
  t/[tenant]/          # Área autenticada multi-tenant
components/             # Componentes UI e layout
lib/                    # Camadas de domínio e serviços
  firebase/            # Firebase Admin e Client
  drive/               # Google Drive API
  repositories/        # Acesso a dados (Firestore)
  services/            # Regras de negócio
  session.ts           # Sessão e autenticação
  schemas.ts           # Zod schemas, enums
  search.ts            # Search tokens
```

## Segurança, multi-tenant e RBAC
- **Resolução de tenant**: `/t/[tenant]` → `tenantId` via slug.
- **Validação de tenant**: queries server-side sempre filtram por `tenantId`.
- **RBAC**: permissões controlam UI e backend (ADMIN, COBRANCA, LOGISTICA, INTERNO, RECEBEDOR).

## Performance mobile
- **Paginação** em listagens (tickets/agenda).
- **Sem filtros pesados em memória**: consultas server-side.
- **Uploads sob demanda** e preview leve.
- **Stepper/tabs** com rendering condicional.

## Documentação detalhada
- [docs/SETUP.md](docs/SETUP.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/TENANCY_RBAC.md](docs/TENANCY_RBAC.md)
- [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)
- [docs/GOOGLE_DRIVE.md](docs/GOOGLE_DRIVE.md)
- [docs/FIREBASE.md](docs/FIREBASE.md)
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
