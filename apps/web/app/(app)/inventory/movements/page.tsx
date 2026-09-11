"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CsvActions } from "@/components/CsvActions";
import { downloadCsv } from "@/lib/csv";

interface TxRow {
  id: string;
  type: string;
  sku: string;
  articleName: string;
  warehouseName: string;
  locationCode: string;
  fromStatus: string;
  toStatus: string;
  quantity: string;
  balanceAfter: string;
  reference: string;
  performer: string;
  reason: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function InventoryMovementsPage() {
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api<
          Array<{
            id: string;
            type: string;
            quantity: string | number;
            balanceAfter?: string | number | null;
            fromStatus?: string | null;
            toStatus?: string | null;
            reason?: string | null;
            referenceType?: string | null;
            referenceId?: string | null;
            createdAt: string;
            article?: { sku: string; name: string };
            warehouse?: { name: string };
            location?: { code: string } | null;
            performer?: { fullName: string };
          }>
        >("/inventory/transactions", { params: { pageSize: 200 } });
        const rows = Array.isArray(data) ? data : [];
        setTransactions(
          rows.map((t) => ({
            id: t.id,
            type: t.type,
            sku: t.article?.sku ?? "—",
            articleName: t.article?.name ?? "—",
            warehouseName: t.warehouse?.name ?? "—",
            locationCode: t.location?.code ?? "—",
            fromStatus: t.fromStatus ?? "—",
            toStatus: t.toStatus ?? "—",
            quantity: String(t.quantity),
            balanceAfter: t.balanceAfter != null ? String(t.balanceAfter) : "—",
            reference:
              t.referenceType && t.referenceId
                ? `${t.referenceType}:${t.referenceId.slice(0, 8)}`
                : "—",
            performer: t.performer?.fullName ?? "—",
            reason: t.reason ?? "—",
            createdAt: t.createdAt,
          })),
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function exportTx() {
    downloadCsv(
      "inventory-movements.csv",
      transactions.map((t) => ({
        datetime: t.createdAt,
        type: t.type,
        sku: t.sku,
        article: t.articleName,
        warehouse: t.warehouseName,
        location: t.locationCode,
        from_status: t.fromStatus,
        to_status: t.toStatus,
        quantity: t.quantity,
        balance_after: t.balanceAfter,
        reference: t.reference,
        performed_by: t.performer,
        reason: t.reason,
      })),
    );
  }

  const columns: Column<TxRow>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <StatusBadge status={row.type} variant="info" />,
    },
    { key: "sku", header: "SKU", mono: true },
    { key: "articleName", header: "Article" },
    { key: "warehouseName", header: "Warehouse" },
    { key: "quantity", header: "Qty", mono: true },
    { key: "fromStatus", header: "From" },
    { key: "toStatus", header: "To" },
    { key: "balanceAfter", header: "Bal after", mono: true },
    { key: "performer", header: "By" },
    { key: "reason", header: "Reason" },
  ];

  return (
    <>
      <PageHeader
        title="Inventory movements"
        description="Authoritative ledger of every stock change — who, what, when, before/after."
        actions={<CsvActions onExport={exportTx} disabled={loading} />}
      />

      <SectionIntro
        eyebrow="Ledger"
        title="No silent stock edits"
        body="Every receive, adjust, reserve, transfer, and dispatch writes a transaction row. Balances are projections; this list is the audit trail for inventory."
        items={[
          "Type, quantity, and status transition",
          "User who performed the action",
          "Optional reason and source document reference",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Transactions loaded</div>
          <div className="detail-chip__value">{transactions.length}</div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        loading={loading}
        emptyMessage="No transactions recorded yet."
        searchPlaceholder="Search type, SKU, user, reason…"
        searchKeys={["type", "sku", "articleName", "warehouseName", "performer", "reason"]}
        getRowKey={(row) => row.id}
        footer={`${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`}
      />
    </>
  );
}
