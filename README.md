# Inventory Ops

Transaction-based Inventory, Warehouse, Production, Sorting & Order Management System.

## Stack

- **API:** NestJS + Prisma + PostgreSQL
- **Web:** Next.js 15 App Router (static export for Render / APK)
- **Shared:** `@inventory-ops/shared` enums & permission codes

> Production / Render uses PostgreSQL. Set `DATABASE_URL` to your Postgres connection string (see `apps/api/.env.example`).

## Quick start

```bash
cd inventory-ops
npm install
npm run build -w @inventory-ops/shared
npm run prisma:generate -w @inventory-ops/api
npm run prisma:push -w @inventory-ops/api
npm run prisma:seed -w @inventory-ops/api
npm run dev:api
npm run dev:web
```

- Web: http://localhost:3000  
- API: http://localhost:4000/api/v1/health  

**Login:** `farooqpatel259` / `farooqpatel2006`

## What's working now

- Auth + RBAC (JWT, granular permissions)
- Articles, categories, units
- Warehouses & location hierarchy
- Inventory engine (receive / adjust / reserve / release) with ledger + audit
- Suppliers, purchase orders, receiving → putaway to AVAILABLE
- Dashboard KPIs from live balances
- Operational UI shell with remaining modules stubbed

## Architecture docs

See [`docs/architecture/`](docs/architecture/).
