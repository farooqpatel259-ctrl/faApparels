export const PERMISSIONS = [
  "inventory.view",
  "inventory.create",
  "inventory.edit",
  "inventory.adjust",
  "inventory.approve",
  "articles.view",
  "articles.manage",
  "warehouses.view",
  "warehouses.manage",
  "purchasing.view",
  "purchasing.create",
  "purchasing.receive",
  "purchasing.approve",
  "production.view",
  "production.manage",
  "sorting.view",
  "sorting.manage",
  "qc.view",
  "qc.inspect",
  "orders.view",
  "orders.manage",
  "orders.dispatch",
  "users.manage",
  "roles.manage",
  "settings.manage",
  "audit.view",
  "reports.export",
  "dashboard.view",
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];

export const ROLE_CODES = [
  "SUPER_ADMIN",
  "INVENTORY_MANAGER",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_WORKER",
  "PRODUCTION_MANAGER",
  "SORTING_MANAGER",
  "QC_MANAGER",
  "PURCHASING_MANAGER",
  "SALES_MANAGER",
  "VIEWER",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const INVENTORY_STATUSES = [
  "EXPECTED",
  "RECEIVED",
  "INSPECTION",
  "SORTING_PENDING",
  "SORTING_IN_PROGRESS",
  "QC_PENDING",
  "AVAILABLE",
  "RESERVED",
  "PRODUCTION",
  "PACKED",
  "READY_TO_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
  "RETURNED",
  "DAMAGED",
  "REJECTED",
  "QUARANTINE",
  "SCRAP",
  "MISSING",
] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export const TX_TYPES = [
  "OPENING",
  "PURCHASE_RECEIPT",
  "PRODUCTION_COMPLETE",
  "PRODUCTION_CONSUME",
  "SALE",
  "DISPATCH",
  "RESERVE",
  "RELEASE_RESERVE",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "RETURN",
  "DAMAGE",
  "REJECTION",
  "SORT",
  "PACK",
  "ADJUSTMENT",
  "COUNT_CORRECTION",
  "SCRAP",
  "LOSS",
  "PUTAWAY",
] as const;

export type TxType = (typeof TX_TYPES)[number];

export const AVAILABLE_STATUSES: InventoryStatus[] = ["AVAILABLE"];
