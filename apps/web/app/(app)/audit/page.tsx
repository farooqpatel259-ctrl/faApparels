"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { downloadCsv } from "@/lib/csv";

interface AuditRow {
  id: string;
  when: string;
  who: string;
  action: string;
  plainAction: string;
  entity: string;
  reason: string;
  detail: string;
}

const ACTION_PLAIN: Record<string, string> = {
  INVENTORY_RECEIVE: "Stock received into a location",
  INVENTORY_ADJUST: "Stock quantity was corrected (adjustment)",
  INVENTORY_RESERVE: "Stock reserved for an order",
  INVENTORY_RELEASE: "Reservation released back to Available",
  SEED_DEMO_DATA: "Demo / seed data was loaded",
};

function plainAction(action: string): string {
  return ACTION_PLAIN[action] ?? action.replace(/_/g, " ").toLowerCase();
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

function summarizeJson(value: unknown): string {
  if (value == null) return "—";
  try {
    const obj = typeof value === "string" ? JSON.parse(value) : value;
    if (typeof obj !== "object" || obj === null) return String(obj);
    const record = obj as Record<string, unknown>;
    const bits: string[] = [];
    if (record.type) bits.push(`type ${record.type}`);
    if (record.quantity != null) bits.push(`qty ${record.quantity}`);
    if (record.status) bits.push(`status ${record.status}`);
    if (record.toStatus) bits.push(`to ${record.toStatus}`);
    if (record.fromStatus) bits.push(`from ${record.fromStatus}`);
    if (bits.length) return bits.join(" · ");
    return JSON.stringify(obj).slice(0, 80);
  } catch {
    return String(value).slice(0, 80);
  }
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api<
          Array<{
            id: string;
            action: string;
            entityType: string;
            entityId?: string | null;
            reason?: string | null;
            afterJson?: unknown;
            beforeJson?: unknown;
            createdAt: string;
            user?: { fullName: string; email: string } | null;
          }>
        >("/audit-logs", { params: { pageSize: 200 } });

        setRows(
          (Array.isArray(data) ? data : []).map((a) => ({
            id: a.id,
            when: formatDate(a.createdAt),
            who: a.user?.fullName ?? a.user?.email ?? "System",
            action: a.action,
            plainAction: plainAction(a.action),
            entity: a.entityType + (a.entityId ? ` · ${a.entityId.slice(0, 8)}` : ""),
            reason: a.reason ?? "—",
            detail: summarizeJson(a.afterJson ?? a.beforeJson),
          })),
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load audit log");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const actions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action))).sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      actionFilter === "ALL"
        ? rows
        : rows.filter((r) => r.action === actionFilter),
    [rows, actionFilter],
  );

  function exportCsv() {
    downloadCsv(
      "audit-log.csv",
      filtered.map((r) => ({
        when: r.when,
        who: r.who,
        action: r.action,
        meaning: r.plainAction,
        entity: r.entity,
        reason: r.reason,
        detail: r.detail,
      })),
    );
  }

  const columns: Column<AuditRow>[] = [
    { key: "when", header: "When" },
    { key: "who", header: "Who" },
    {
      key: "action",
      header: "Action",
      render: (row) => <StatusBadge status={row.action} variant="info" />,
    },
    { key: "plainAction", header: "In plain English" },
    { key: "entity", header: "What changed", mono: true },
    { key: "reason", header: "Why" },
    { key: "detail", header: "Detail" },
  ];

  return (
    <>
      <PageHeader
        title="Audit log"
        description="A history of important changes — who did what, when, and why. You can read it; you cannot edit or delete it."
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportCsv}
            disabled={loading || filtered.length === 0}
          >
            Download CSV
          </button>
        }
      />

      <SectionIntro
        eyebrow="Trust & history"
        title="What is the audit log?"
        body="Whenever stock is received, adjusted, or reserved, the system writes a permanent note. Use this page if someone asks “who changed this quantity?”"
        items={[
          "Who — the signed-in user",
          "What — receive / adjust / reserve / etc.",
          "Why — the reason entered at the time",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Events shown</div>
          <div className="detail-chip__value">{filtered.length}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Action types</div>
          <div className="detail-chip__value">{actions.length}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Latest</div>
          <div className="detail-chip__value" style={{ fontSize: 14 }}>
            {rows[0]?.when ?? "—"}
          </div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Editable?</div>
          <div className="detail-chip__value" style={{ fontSize: 14 }}>
            No
          </div>
        </div>
      </div>

      <div className="form-panel" style={{ paddingBottom: 14 }}>
        <div className="form-field" style={{ maxWidth: 320 }}>
          <label htmlFor="actionFilter">Filter by action</label>
          <select
            id="actionFilter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="ALL">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {plainAction(a)} ({a})
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No audit events yet. Adjust or receive stock to create the first entries."
        searchPlaceholder="Search who, action, reason…"
        searchKeys={["who", "action", "plainAction", "entity", "reason", "detail"]}
        getRowKey={(row) => row.id}
        footer={`${filtered.length} event${filtered.length === 1 ? "" : "s"} · read-only`}
      />
    </>
  );
}
