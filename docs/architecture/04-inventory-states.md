# 04 — Inventory States

States are **configurable**. Not every org uses every state.

## Core states

| Code | Meaning | Counts as available? (default) |
|---|---|---|
| EXPECTED | On open PO / inbound | No |
| RECEIVED | Physically received, not yet accepted | No |
| INSPECTION | Under receiving/return inspection | No |
| SORTING_PENDING | Queued for sorting | No |
| SORTING_IN_PROGRESS | Being sorted | No |
| QC_PENDING | Awaiting QC | No |
| AVAILABLE | Sellable / issuable | **Yes** |
| RESERVED | Held for order/production | No |
| PRODUCTION | WIP / in manufacturing | No |
| PACKED | In packages | No* |
| READY_TO_DISPATCH | Packed & staged | No* |
| DISPATCHED | Left warehouse | No (not on-hand) |
| DELIVERED | Confirmed with customer | No |
| RETURNED | Return received | No |
| DAMAGED | Damaged | No |
| REJECTED | Failed QC / rejected | No |
| QUARANTINE | Hold | No |
| SCRAP | Written off | No |
| MISSING / LOST | Shrinkage tracking | No |

\* Some orgs may treat packed/ready as still “owned” physical stock — yes for on-hand totals, no for available-to-promise.

## Distinctions

| Metric | Definition |
|---|---|
| Physical / on-hand | Sum of status quantities still in warehouse control |
| Available | Statuses flagged `is_available` |
| Reserved | RESERVED |
| In-process | PRODUCTION, SORTING_*, QC_PENDING, INSPECTION |
| Damaged/rejected | DAMAGED, REJECTED, SCRAP, QUARANTINE |

## State diagram (primary)

```text
EXPECTED
  → RECEIVED
    → INSPECTION
      → SORTING_PENDING → SORTING_IN_PROGRESS → QC_PENDING → AVAILABLE
      → DAMAGED / REJECTED / QUARANTINE

AVAILABLE
  → RESERVED → (picking) → PACKED → READY_TO_DISPATCH → DISPATCHED → DELIVERED
  → PRODUCTION (as material issue / WIP)
  → DAMAGED / MISSING (adjustment)

DELIVERED → RETURNED → INSPECTION → AVAILABLE | DAMAGED | REJECTED | QUARANTINE

REJECTED → (rework) → QC_PENDING
```

## Transaction types (ledger)

`OPENING | PURCHASE_RECEIPT | PRODUCTION_COMPLETE | PRODUCTION_CONSUME | SALE | DISPATCH | RESERVE | RELEASE_RESERVE | TRANSFER_OUT | TRANSFER_IN | RETURN | DAMAGE | REJECTION | SORT | PACK | ADJUSTMENT | COUNT_CORRECTION | SCRAP | LOSS`

Each transaction records: article, variant, warehouse, location, from_status, to_status, qty, unit cost (optional), reference type/id, user, timestamp, notes.
