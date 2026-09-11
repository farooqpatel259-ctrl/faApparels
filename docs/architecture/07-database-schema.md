# 07 — Database Schema (Draft)

Conventions:

- UUID primary keys (or ULID) unless noted
- `created_at`, `updated_at` on all tables
- `deleted_at` soft delete on master data (articles, suppliers, warehouses, users)
- Money as `numeric(18,4)`; quantities as `numeric(18,4)` (supports fractional units)
- All FKs indexed; unique constraints on business keys

## Core tables (summary)

### users
`id, email UNIQUE, password_hash, full_name, phone, is_active, last_login_at, …`

### roles / permissions / role_permissions / user_roles
Standard RBAC join tables. `permissions.code UNIQUE`.

### categories
`id, parent_id NULL, name, code UNIQUE, sort_order, is_active`

### units
`id, code UNIQUE, name, decimal_places`

### suppliers
`id, code UNIQUE, name, contact_name, phone, email, address, tax_info, payment_terms, credit_limit, lead_time_days, rating, is_active`

### articles
```text
id, sku UNIQUE, name, description, category_id, brand, model,
size, color, material, unit_id, barcode UNIQUE NULL, qr_code UNIQUE NULL,
default_supplier_id, min_stock, max_stock, reorder_level, reorder_qty,
cost_price, selling_price, tax_rate, weight, dimensions_json,
status, is_active, …
```

### article_variants
`id, article_id, sku UNIQUE, name, size, color, barcode UNIQUE NULL, …`
Inventory tracks at **variant** level when variants exist; else article-level (`variant_id` null).

### warehouses
`id, code UNIQUE, name, manager_user_id, capacity, address, is_active`

### locations
```text
id, warehouse_id, parent_id NULL, code, name,
level ENUM(ZONE,RACK,SHELF,BIN,OTHER), barcode UNIQUE NULL, is_active
UNIQUE(warehouse_id, code)
```

### inventory_statuses
`code PK, name, is_on_hand, is_available, sort_order, is_system`

### inventory_balances
```text
id,
article_id, variant_id NULL,
warehouse_id, location_id NULL,
status,
quantity numeric(18,4) CHECK (quantity >= 0),
version int,
UNIQUE(article_id, variant_id, warehouse_id, location_id, status)
```

### inventory_transactions
```text
id, type, article_id, variant_id NULL,
warehouse_id, location_id NULL,
from_status NULL, to_status NULL,
quantity, balance_after NULL,
unit_cost NULL,
reference_type, reference_id,
performed_by, reason, notes, created_at
INDEX(article_id, created_at)
INDEX(reference_type, reference_id)
```

### purchase_orders / purchase_order_items
Header: `number UNIQUE, supplier_id, status, order_date, expected_date, …`  
Lines: `article_id, variant_id, qty_ordered, qty_received, unit_cost`  
Pending = ordered − received (computed).

### receivings / receiving_items
`number, po_id NULL, warehouse_id, received_by, received_at, status`  
Lines: expected/received/short/excess/damaged/accepted/rejected qtys.

### bom / bom_items
Finished article/variant → component article/variant + qty_per.

### production_orders
```text
number, article_id, variant_id, qty_planned, qty_completed, qty_rejected, qty_damaged,
planned_start, planned_end, actual_start, actual_end, expected_ready_date,
status, progress_pct, assigned_team, bom_id, …
```

### sorting_orders
`number, article_id, variant_id, qty, priority, criteria, assigned_to, dates, status, accepted_qty, rejected_qty, location_id, …`

### quality_inspections / items
`source_type, source_id, inspector_id, inspected_at, status`  
Items: inspected/passed/failed, defect_type, corrective_action.

### sales_orders / items / customers
Standard order header/lines with status lifecycle.

### reservations
`order_id, article_id, variant_id, warehouse_id, location_id, qty, status, expires_at`

### picking_orders / packing_orders / packages / dispatches / returns
Operational docs linking to orders and generating inventory transactions.

### transfers / transfer_items
`from_warehouse, to_warehouse, status, …`

### stock_adjustments / stock_counts (+ items)
Include previous_qty, new_qty, difference, reason, approval_id.

### notifications / notification_rules
Event type, payload, user_id, read_at.

### audit_logs
```text
id, user_id, action, entity_type, entity_id,
before_json, after_json, reason, ip, user_agent, created_at
```
Immutable (no update/delete for non-system).

### attachments
`entity_type, entity_id, file_key, file_name, mime, uploaded_by`

### system_settings / document_sequences
Key-value settings; sequences for PO-/SO-/TR- numbering.

## Integrity rules

1. Balance updates only inside transactions that also insert ledger rows.
2. `CHECK (quantity >= 0)` on balances (configurable override for backorders later).
3. Unique SKU / barcode globally.
4. Soft-deleted masters cannot be used on new documents.
