# 08 — API Architecture

## Style

- REST JSON under `/api/v1`
- NestJS modules mirror domain modules
- DTOs validated with **Zod** (shared package) or class-validator — prefer Zod shared with frontend
- Auth: `Authorization: Bearer` + httpOnly refresh cookie
- Every mutating endpoint checks permission guard
- Idempotency-Key header for receiving/dispatch/adjust posts (recommended)

## Response envelope

```json
{
  "data": {},
  "meta": { "page": 1, "pageSize": 50, "total": 123 },
  "error": null
}
```

Errors:

```json
{
  "data": null,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Available quantity is 20",
    "details": { "available": 20, "requested": 50 }
  }
}
```

## Resource groups (examples)

| Group | Examples |
|---|---|
| Auth | `POST /auth/login`, `/logout`, `/refresh`, `/me` |
| Users/Roles | `/users`, `/roles`, `/permissions` |
| Articles | `/articles`, `/articles/:id/variants`, `/categories`, `/units` |
| Warehouses | `/warehouses`, `/warehouses/:id/locations` |
| Inventory | `/inventory/balances`, `/inventory/transactions`, `/inventory/operations/*` |
| Purchasing | `/suppliers`, `/purchase-orders`, `/receivings` |
| Production | `/boms`, `/production-orders`, `/production-orders/:id/start` |
| Sorting | `/sorting-orders`, `/:id/assign`, `/:id/complete` |
| QC | `/quality-inspections` |
| Orders | `/customers`, `/sales-orders`, `/reservations` |
| Warehouse ops | `/transfers`, `/picking-orders`, `/packing-orders`, `/dispatches` |
| Returns | `/returns` |
| Adjustments | `/stock-adjustments`, `/stock-counts` |
| Reports | `/reports/:type` |
| Dashboard | `/dashboard/kpis`, `/dashboard/charts/:name` |
| Notifications | `/notifications` |
| Audit | `/audit-logs` |
| Search | `/search?q=` |
| Settings | `/settings` |
| Attachments | `/attachments` |

## Inventory operations API

Prefer explicit command endpoints over generic PATCH of balances:

```text
POST /inventory/operations/receive
POST /inventory/operations/issue
POST /inventory/operations/transfer
POST /inventory/operations/reserve
POST /inventory/operations/release-reservation
POST /inventory/operations/adjust
POST /inventory/operations/damage
POST /inventory/operations/produce
POST /inventory/operations/consume
…
```

Each calls `InventoryEngine` domain service.

## Pagination / filters

- Cursor or offset pagination; default page size 50
- Standard query: `search`, `status`, `warehouseId`, `categoryId`, `from`, `to`, `sort`

## Versioning & docs

- OpenAPI (Swagger) generated from NestJS
- `/api/docs` in non-production
