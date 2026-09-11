# 01 — Technology Stack (Proposed)

## Recommendation

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 15 (App Router) + TypeScript** | Desktop-first admin UI, strong routing, SSR options for reports |
| UI kit | **TanStack Table + custom design tokens** | Fast operational tables; avoid over-styled dashboards |
| Forms / validation (client) | **React Hook Form + Zod** | Align with server Zod schemas |
| Backend | **NestJS + TypeScript** | Clear modules, DI, guards for RBAC, domain services |
| ORM | **Prisma** | Migrations, type-safe models; raw SQL for locked balance updates where needed |
| Database | **PostgreSQL 16** | ACID, row locks, partial indexes, check constraints |
| Auth | **JWT access + refresh cookies** (httpOnly) | Stateless API + secure browser sessions |
| File storage | **Local disk (dev) / S3-compatible (prod)** | Documents & images |
| Jobs / notifications | **BullMQ + Redis** | Delayed production checks, low-stock events |
| PDF/Excel | **ExcelJS + PDFKit (or Puppeteer later)** | Report export |
| Testing | **Jest (API) + Playwright (e2e workflows)** | Unit + workflow acceptance |
| Monorepo | **pnpm workspaces** | `apps/web`, `apps/api`, `packages/shared` |

## Alternatives considered

| Option | Verdict |
|---|---|
| Django / FastAPI | Excellent; NestJS chosen for one language across stack |
| MongoDB | Rejected — inventory needs relational integrity |
| Direct balance CRUD | Rejected — violates ledger principle |

## Repository layout (planned)

```text
inventory-ops/
  apps/
    api/          # NestJS
    web/          # Next.js
  packages/
    shared/       # Zod schemas, enums, permission keys
  docs/
    architecture/
  docker-compose.yml   # postgres + redis
```

## Concurrency strategy

Stock mutations:

1. Begin DB transaction
2. `SELECT … FOR UPDATE` on relevant balance rows (or advisory lock on article+location+status)
3. Validate available qty / business rules
4. Insert `inventory_transactions`
5. Upsert `inventory_balances`
6. Write `audit_logs`
7. Commit

Optimistic version columns (`version`) as secondary guard.

## Environment

- Node.js 22 LTS
- Docker Compose for local Postgres + Redis
- `.env` for secrets (never commit)

## Decision needed from you

Confirm or override:

1. NestJS + Next.js + PostgreSQL (recommended)
2. Single-tenant (one company) for v1 — **yes**
3. Barcode scanning via USB/keyboard wedge first; camera scanning later — **yes**
