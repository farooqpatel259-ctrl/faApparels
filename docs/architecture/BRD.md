# Business Requirements Document (BRD)

## 1. Vision

A full **Inventory & Production Management System** covering warehouse, purchasing, production, sorting, QC, orders, and audit — not a stock-count spreadsheet.

## 2. Primary users

Warehouse workers, inventory/warehouse/production/sorting/QC/purchasing/sales managers, viewers, super admins.

## 3. Modules (v1)

Dashboard; Articles/Categories/Variants; Suppliers; Warehouses/Locations; Inventory + Transactions; Purchasing/Receiving; Production/BOM/Scheduling; Sorting; QC; Reservations/Picking/Packing; Orders/Dispatch/Returns; Transfers; Adjustments; Stock Count; Aging; Reorder; Notifications; Users/Roles/Permissions; Approvals; Audit; Reports; Attachments; Settings; Barcode/QR.

## 4. Business rules (selected)

1. Transaction ledger is mandatory for all stock changes.  
2. Available ≠ physical; status buckets are first-class.  
3. No over-reservation of available stock.  
4. Partial receive / produce / sort / dispatch / transfer supported.  
5. Returns never auto-available without inspection (configurable).  
6. Adjustments and write-offs require reason + optional approval.  
7. Delayed production flagged when expected ready date passes.  
8. Low stock when on-hand/available ≤ reorder level (configurable basis).  
9. Duplicate SKU/barcode rejected.  
10. Unspecified rules → system settings, not hard-coded magic.

## 5. Calculations

- PO pending = ordered − received  
- Available = sum(balances where status.is_available)  
- Aging = days since receipt lot/date-in (lot tracking light in v1: use last inbound txn date per balance line; full lot/batch optional later)  
- Production progress % = completed / planned (capped)  
- Inventory valuation = qty × cost (moving average or standard — **default: standard cost on article; configurable later**)

## 6. Reports

Inventory (current, by warehouse/location/article, valuation, low/over, aging, movements); Production; Sorting; QC; Warehouse ops; Purchasing; Management (turnover, dead/fast/slow). All: filter, search, sort, export Excel/PDF.

## 7. Non-functional

- Desktop-first, mobile-friendly scan flows  
- Concurrent-safe stock updates  
- Auditability and RBAC  
- Maintainable modular codebase  
- Backup/restore procedure before production  

## 8. Assumptions (to confirm)

| # | Assumption | Default |
|---|---|---|
| A1 | Single company / single tenant | Yes |
| A2 | Currency | PKR (configurable) |
| A3 | Lot/batch/serial tracking | Deferred after v1 core |
| A4 | Multi-currency / multi-tax engines | Simple tax rate on article |
| A5 | Language | English UI first |
| A6 | Cost method | Standard cost initially |

## 9. Open questions for Farooq

1. Confirm tech stack (NestJS + Next.js + PostgreSQL)?  
2. Industry focus (apparel/garment sorting assumed from “sorting” emphasis) — any special attributes?  
3. Need lot/batch in v1 or later?  
4. Single warehouse first or multi-warehouse from day one? (schema supports multi either way)  
5. Preferred SKU numbering rules?
