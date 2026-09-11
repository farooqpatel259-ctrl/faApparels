# 03 — Roles & Permissions Matrix

## Initial roles

| Role | Intent |
|---|---|
| Super Admin | Full access |
| Inventory Manager | Inventory + warehouses + adjustments (approve) |
| Warehouse Manager | Warehouse ops, transfers, receiving, dispatch |
| Warehouse Worker | Receive, pick, pack, transfer execute, count |
| Production Manager | Production orders, BOM, schedule, complete |
| Sorting Manager | Sorting queue, assign, complete |
| QC Manager | Inspections, pass/fail |
| Purchasing Manager | Suppliers, POs, expected inventory |
| Sales Manager | Orders, reservations, returns |
| Viewer | Reports & dashboards only |

## Permission model

Permissions are granular keys: `{module}.{action}`.

Examples:

```text
inventory.view | inventory.create | inventory.edit | inventory.delete
inventory.adjust | inventory.approve
production.view | production.create | production.start | production.complete | production.approve
sorting.view | sorting.assign | sorting.complete
qc.view | qc.inspect | qc.approve
purchasing.view | purchasing.create | purchasing.receive | purchasing.approve
orders.view | orders.create | orders.reserve | orders.dispatch | orders.cancel
warehouse.transfer | warehouse.pick | warehouse.pack
users.manage | roles.manage | settings.manage
audit.view
reports.export
```

Roles are many-to-many with permissions. Users may have multiple roles.

## Matrix (abbreviated)

| Capability | Super | Inv Mgr | WH Mgr | Worker | Prod | Sort | QC | Purch | Sales | Viewer |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| View inventory | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Adjust stock | ✓ | ✓ | ✓ | | | | | | | |
| Approve adjustment | ✓ | ✓ | | | | | | | | |
| Receive | ✓ | ✓ | ✓ | ✓ | | | | ✓ | | |
| Transfer request | ✓ | ✓ | ✓ | ✓ | | | | | | |
| Transfer approve | ✓ | ✓ | ✓ | | | | | | | |
| Production manage | ✓ | | | | ✓ | | | | | |
| Sorting manage | ✓ | | | | | ✓ | | | | |
| QC inspect | ✓ | | | | | | ✓ | | | |
| Create PO | ✓ | | | | | | | ✓ | | |
| Create order | ✓ | | | | | | | | ✓ | |
| Dispatch | ✓ | | ✓ | ✓ | | | | | ✓ | |
| Manage users | ✓ | | | | | | | | | |
| Export reports | ✓ | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View audit | ✓ | ✓ | | | | | | | | |

Full matrix will be seeded in code as `packages/shared/permissions.ts`.

## Approval-required actions (configurable)

- Stock adjustment / write-off
- Purchase order (above threshold)
- Inventory transfer
- Production cancellation
- Order cancellation
- Return acceptance to available
- Stock count discrepancy posting

## Security rules

- Enforce permissions **server-side** on every mutation.
- Audit logs are append-only; ordinary users cannot edit/delete.
- Viewer role: GET only; no mutations.
