# 02 — Module Dependency Map

Build bottom-up. Arrows mean “depends on.”

```text
Settings / Numbering / Units
        ↑
Users → Roles → Permissions → Approvals → Audit
        ↑
Articles ← Categories / Variants / Barcodes
        ↑
Warehouses → Locations (Zone → Rack → Shelf → Bin)
        ↑
★ Inventory Engine (transactions + balances)
        ↑
   ┌────┼────┬──────────┬─────────┐
   │    │    │          │         │
Purchasing  Production  Sorting   QC (reusable)
(PO/Recv)   (BOM/Sched)
   │    │    │          │         │
   └────┴────┴────┬─────┴─────────┘
                  │
         Reservations / Picking / Packing
                  │
         Orders / Dispatch / Returns
                  │
         Transfers / Adjustments / Stock Count
                  │
         Dashboard / Reports / Notifications / Search
```

## Module list

| # | Module | Depends on | Phase |
|---|---|---|---|
| 1 | Auth & RBAC | Users, roles, permissions | 4 |
| 2 | Articles / Categories / Variants / Units | Auth | 5 |
| 3 | Warehouses / Locations | Auth | 6 |
| 4 | **Inventory Engine** | Articles, Locations | 7 |
| 5 | Suppliers / PO / Receiving | Inventory, Articles | 8 |
| 6 | Production / BOM / Schedule | Inventory, Articles | 9 |
| 7 | Sorting | Inventory | 10 |
| 8 | Quality Control | Inventory + source docs | 11 |
| 9 | Reservations / Picking / Packing | Inventory, Orders | 12 |
| 10 | Orders / Dispatch / Returns | Reservations, Packing | 13 |
| 11 | Transfers / Adjustments | Inventory | 14 |
| 12 | Stock Counting | Inventory, Adjustments | 15 |
| 13 | Dashboard / Reports | All transactional modules | 16 |
| 14 | Notifications | Events from above | 17 |
| 15 | Barcode / QR workflows | Articles, Locations, ops | 18 |
| 16 | Audit hardening / Security | All | 19 |
| 17 | Automated testing | All | 20 |

## Inventory engine operations (domain API)

```text
receive | issue | transfer | reserve | releaseReservation
adjust | damage | return | produce | consume | sort | pack | dispatch
```

Every operation → transaction row + balance update + audit.

## Soft boundaries

- **QC** is one reusable engine keyed by `source_type` + `source_id`.
- **Approvals** wrap high-risk actions (adjustment, write-off, transfer, PO, cancellations).
- **Dashboard KPIs** are queries/aggregations over balances + open documents — never duplicated counters.
