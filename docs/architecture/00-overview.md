# 00 — Overview & Core Principles

## Purpose

Build a production-ready Inventory and Operations Management System that answers:

- What inventory do we have **right now**, and **where**?
- How much is available / reserved / in production / sorting / packed / dispatched / damaged?
- When will an article be ready?
- What needs sorting, and what quantity?
- What is expected to arrive?
- What is below minimum or aging/stuck?
- Who changed what, before/after, and why?

## Core principle: transaction-based inventory

Inventory balances may be cached for performance.

The **inventory transaction ledger** is the authoritative history.

```text
Opening
+ Purchases / Receipts
+ Production completed
+ Transfers in
+ Customer returns
− Sales / Dispatch
− Production consumption
− Transfers out
− Damaged / Lost
± Approved adjustments
= Current stock
```

**Critical rule:** never update `inventory_balances` without a corresponding `inventory_transactions` row and audit event, inside the same DB transaction.

## Quantity vs status

Separate **physical quantity** from **status buckets**.

Example for article `ABC-001`:

| Bucket | Qty |
|---|---:|
| Total physical | 1,000 |
| Available | 650 |
| Reserved | 100 |
| Production | 80 |
| Sorting pending | 50 |
| Ready | 70 |
| Damaged | 20 |
| Returned | 30 |

Configurable: which statuses count as “available.”

## Inventory lifecycle (happy path)

```text
EXPECTED → RECEIVED → INSPECTION → SORTING → QC
→ AVAILABLE → RESERVED → PICKING → PACKING
→ READY_TO_DISPATCH → DISPATCHED → DELIVERED
```

Alternate paths: Damaged, Rejected → Rework → QC, Returned → Inspection → Available/Damaged/Rejected/Quarantine.

## Architecture style

| Layer | Responsibility |
|---|---|
| Presentation (web UI) | Operational screens, scanning flows, reports |
| API | Auth, validation, permissions, DTO mapping |
| Domain services | Inventory engine, workflows, approvals |
| Persistence | PostgreSQL, migrations, row-level locking |
| Cross-cutting | Audit, notifications, attachments, settings |

Domain services own stock mutations. Controllers/UI never write balances directly.

## Out of scope for v1 (configurable later)

- Advanced ML forecasting (hooks only)
- Multi-company / multi-tenant SaaS billing
- Full accounting/GL integration
- Customer-facing e-commerce storefront

## Success definition

Screens alone are not enough. End-to-end workflows must move stock correctly with full transaction + audit history (see acceptance criteria in roadmap).
