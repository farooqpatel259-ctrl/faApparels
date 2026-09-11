# 05 — Major Workflows

## 1. Purchasing & receiving

```text
Supplier → PO (ordered qty)
  → Expected inventory (pending = ordered − received)
  → Receiving (partial OK)
  → Inspection → Accepted / Rejected / Damaged
  → Sorting (if required) → QC (if required)
  → Putaway to location → AVAILABLE (or configured status)
```

**Rules**

- Partial receiving allowed.
- PO not fully received until business rule satisfied (default: received ≥ ordered, within tolerance).
- Short / excess / damaged quantities recorded on receiving lines.

## 2. Production

```text
Production Order
  → BOM explode → Material requirement
  → Reserve materials → Issue materials (consume)
  → Start → In Progress (progress %)
  → QC → Complete finished goods → inventory RECEIVE (PRODUCTION_COMPLETE)
```

**Tracked fields:** planned/completed/rejected/damaged qty; planned/actual/expected dates; team; delay flag when `expected_ready_date < today` and not completed.

Delay updates: if progress stalls past planned completion, recompute `expected_ready_date` from remaining qty × throughput (configurable) or manual revise.

## 3. Sorting

```text
Auto/manual create sorting job
  → Pending → Assigned → In Progress
  → Completed | Partially Completed | Rejected | Re-sort Required
```

Moves qty between SORTING_PENDING ↔ SORTING_IN_PROGRESS ↔ post-sort status (QC_PENDING or AVAILABLE).

## 4. Quality control (reusable)

Triggered by: Receiving | Production | Sorting | Returns.

```text
Create inspection (source_type, source_id)
  → Inspect qty → Pass / Fail + defect type
  → Decision routes inventory to AVAILABLE / REJECTED / REWORK / QUARANTINE
```

## 5. Sales order fulfillment

```text
Order → Confirmed → Reserve available stock
  → Picking list (with locations)
  → Sorting/QC if required
  → Packing → Ready → Dispatch → Delivered
```

Partial fulfillment supported. Cannot reserve more than available.

## 6. Returns

```text
Return received → Inspection
  → AVAILABLE | DAMAGED | REJECTED | REPAIR | QUARANTINE
```

Never auto-available without configured inspection pass.

## 7. Transfer

```text
Draft → Requested → Approved → In Transit → Received | Cancelled
```

`TRANSFER_OUT` then `TRANSFER_IN` (or in-transit status if enabled). Partial OK.

## 8. Adjustment & stock count

```text
Count: System vs Physical → Discrepancy
  → Adjustment draft → Approval → ADJUSTMENT / COUNT_CORRECTION transaction
```

Silent edits forbidden. Always: previous, new, difference, reason, user, time, approval, reference.
