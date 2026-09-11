"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CsvActions } from "@/components/CsvActions";
import { downloadCsv } from "@/lib/csv";

interface BalanceRow {
  id: string;
  sku: string;
  articleName: string;
  warehouseName: string;
  warehouseCode: string;
  locationCode: string;
  status: string;
  quantity: string;
}

export default function InventoryBalancesPage() {
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api<
          Array<{
            id: string;
            quantity: string | number;
            status: string;
            article?: { sku: string; name: string };
            warehouse?: { name: string; code: string };
            location?: { code: string } | null;
          }>
        >("/inventory/balances");
        const rows = Array.isArray(data) ? data : [];
        setBalances(
          rows.map((b) => ({
            id: b.id,
            sku: b.article?.sku ?? "—",
            articleName: b.article?.name ?? "—",
            warehouseName: b.warehouse?.name ?? "—",
            warehouseCode: b.warehouse?.code ?? "—",
            locationCode: b.location?.code ?? "—",
            status: b.status,
            quantity: String(b.quantity),
          })),
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load balances");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? balances
        : balances.filter((b) => b.status === statusFilter),
    [balances, statusFilter],
  );

  const totals = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let pieces = 0;
    for (const b of balances) {
      const q = Number(b.quantity) || 0;
      pieces += q;
      byStatus[b.status] = (byStatus[b.status] ?? 0) + q;
    }
    return { pieces, byStatus, lines: balances.length };
  }, [balances]);

  const statuses = useMemo(
    () => Array.from(new Set(balances.map((b) => b.status))).sort(),
    [balances],
  );

  function exportBalances() {
    downloadCsv(
      "inventory-balances.csv",
      filtered.map((b) => ({
        sku: b.sku,
        article: b.articleName,
        warehouse: b.warehouseName,
        warehouse_code: b.warehouseCode,
        location: b.locationCode,
        status: b.status,
        quantity: b.quantity,
      })),
    );
  }

  const columns: Column<BalanceRow>[] = [
    { key: "sku", header: "SKU", mono: true },
    { key: "articleName", header: "Article" },
    { key: "warehouseCode", header: "WH", mono: true },
    { key: "warehouseName", header: "Warehouse" },
    { key: "locationCode", header: "Location", mono: true },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "quantity", header: "Qty", mono: true },
  ];

  return (
    <>
      <PageHeader
        title="Inventory balances"
        description="Real-time stock positions by article, warehouse, location, and status bucket."
        actions={
          <CsvActions onExport={exportBalances} exportLabel="Export CSV" disabled={loading} />
        }
      />

      <SectionIntro
        eyebrow="Core inventory"
        title="Quantity is separate from status"
        body="The same SKU can appear in multiple rows — Available, Reserved, Damaged, and so on. Only Available counts toward ATP unless you change system settings."
        items={[
          "Balances are projections of the transaction ledger",
          "Location hierarchy: Zone → Rack → Shelf → Bin",
          "Export the filtered view for cycle counts or audits",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Balance lines</div>
          <div className="detail-chip__value">{totals.lines}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Total pieces</div>
          <div className="detail-chip__value">{totals.pieces}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Available</div>
          <div className="detail-chip__value">{totals.byStatus.AVAILABLE ?? 0}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Reserved</div>
          <div className="detail-chip__value">{totals.byStatus.RESERVED ?? 0}</div>
        </div>
      </div>

      <div className="form-panel" style={{ paddingBottom: 14 }}>
        <div className="form-field" style={{ maxWidth: 240 }}>
          <label htmlFor="statusFilter">Filter by status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No inventory balances yet. Receive stock to create the first positions."
        searchPlaceholder="Search SKU, warehouse, location…"
        searchKeys={["sku", "articleName", "warehouseName", "locationCode", "status"]}
        getRowKey={(row) => row.id}
        footer={`${filtered.length} line${filtered.length === 1 ? "" : "s"} shown`}
      />
    </>
  );
}
