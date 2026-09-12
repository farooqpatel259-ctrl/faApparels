"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";

interface ArticleOption {
  id: string;
  sku: string;
  name: string;
  color?: string | null;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

interface ProductionRow {
  id: string;
  number: string;
  sku: string;
  articleName: string;
  color: string;
  warehouseName: string;
  qtyPlanned: number;
  qtyCompleted: number;
  status: string;
  progress: string;
  plannedEnd: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysInputValue(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function ProductionPage() {
  const [orders, setOrders] = useState<ProductionRow[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [articleId, setArticleId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [qtyPlanned, setQtyPlanned] = useState("50");
  const [plannedStart, setPlannedStart] = useState(todayInputValue());
  const [plannedEnd, setPlannedEnd] = useState(plusDaysInputValue(7));

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, articlesRes, warehousesRes] = await Promise.all([
        api<
          Array<{
            id: string;
            number: string;
            status: string;
            qtyPlanned: string | number;
            qtyCompleted: string | number;
            plannedEnd?: string | null;
            article?: { sku: string; name: string; color?: string | null };
            warehouse?: { name: string };
          }>
        >("/production-orders"),
        api<ArticleOption[]>("/articles"),
        api<WarehouseOption[]>("/warehouses"),
      ]);

      const articleList = Array.isArray(articlesRes.data) ? articlesRes.data : [];
      // Prefer finished apparel SKUs for production (ZIP/HDY/CRW/TEE/SHT/PNT)
      const apparelFirst = [...articleList].sort((a, b) => {
        const score = (sku: string) =>
          /^(ZIP|HDY|CRW|TEE|SHT|PNT)-/.test(sku) ? 0 : 1;
        return score(a.sku) - score(b.sku) || a.sku.localeCompare(b.sku);
      });
      setArticles(apparelFirst);

      const warehouseList = Array.isArray(warehousesRes.data)
        ? warehousesRes.data
        : [];
      setWarehouses(warehouseList);

      setOrders(
        (Array.isArray(ordersRes.data) ? ordersRes.data : []).map((o) => {
          const planned = Number(o.qtyPlanned) || 0;
          const done = Number(o.qtyCompleted) || 0;
          const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
          return {
            id: o.id,
            number: o.number,
            sku: o.article?.sku ?? "—",
            articleName: o.article?.name ?? "—",
            color: o.article?.color?.trim() ? o.article.color : "—",
            warehouseName: o.warehouse?.name ?? "—",
            qtyPlanned: planned,
            qtyCompleted: done,
            status: o.status,
            progress: `${pct}%`,
            plannedEnd: formatDate(o.plannedEnd),
          };
        }),
      );

      if (!articleId && apparelFirst[0]) setArticleId(apparelFirst[0].id);
      if (!warehouseId && warehouseList[0]) setWarehouseId(warehouseList[0].id);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load production data",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter],
  );

  const totals = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let planned = 0;
    let done = 0;
    for (const o of orders) {
      planned += o.qtyPlanned;
      done += o.qtyCompleted;
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    }
    return {
      orders: orders.length,
      planned,
      done,
      inProgress: byStatus.IN_PROGRESS ?? 0,
      completed: byStatus.COMPLETED ?? 0,
    };
  }, [orders]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const qty = Number(qtyPlanned);
    if (!articleId || !warehouseId) {
      setFormError("Choose what to make and which warehouse.");
      return;
    }
    if (!qty || qty <= 0) {
      setFormError("Enter how many pieces you plan to make.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api<{ number: string }>("/production-orders", {
        method: "POST",
        body: {
          articleId,
          warehouseId,
          qtyPlanned: qty,
          plannedStart,
          plannedEnd,
        },
      });
      setSuccess(
        `Production order ${created.data.number} created. Start making pieces, then tap +10 or Mark done.`,
      );
      setQtyPlanned("50");
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create order");
    } finally {
      setSubmitting(false);
    }
  }

  async function addProgress(order: ProductionRow, addQty: number) {
    setFormError(null);
    setSuccess(null);
    const next = Math.min(order.qtyPlanned, order.qtyCompleted + addQty);
    try {
      await api(`/production-orders/${order.id}`, {
        method: "PATCH",
        body: { qtyCompleted: next },
      });
      setSuccess(
        next >= order.qtyPlanned
          ? `${order.number} is finished (${next}/${order.qtyPlanned}).`
          : `${order.number} updated to ${next}/${order.qtyPlanned} made.`,
      );
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function setStatus(order: ProductionRow, status: string) {
    setFormError(null);
    try {
      await api(`/production-orders/${order.id}`, {
        method: "PATCH",
        body: {
          status,
          qtyCompleted:
            status === "COMPLETED" ? order.qtyPlanned : order.qtyCompleted,
        },
      });
      setSuccess(`${order.number} marked as ${status.replace(/_/g, " ")}.`);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Status update failed");
    }
  }

  const columns: Column<ProductionRow>[] = [
    { key: "number", header: "Order #", mono: true },
    { key: "sku", header: "SKU", mono: true },
    { key: "articleName", header: "Product" },
    { key: "color", header: "Color" },
    { key: "warehouseName", header: "Warehouse" },
    {
      key: "qtyCompleted",
      header: "Made / Plan",
      mono: true,
      render: (row) => `${row.qtyCompleted} / ${row.qtyPlanned}`,
    },
    { key: "progress", header: "Progress", mono: true },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "plannedEnd", header: "Ready by" },
    {
      key: "id",
      header: "Quick actions",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {row.status !== "COMPLETED" && row.status !== "CANCELLED" && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => addProgress(row, 10)}
              >
                +10 made
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => setStatus(row, "COMPLETED")}
              >
                Mark done
              </button>
            </>
          )}
          {row.status === "PLANNED" && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "4px 8px", fontSize: 12 }}
              onClick={() => setStatus(row, "IN_PROGRESS")}
            >
              Start
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Production"
        description="Plan what to make, track how many pieces are finished, and see when an order should be ready."
      />

      <SectionIntro
        eyebrow="Simple factory board"
        title="How production works here"
        body="A production order is a job ticket: which product (and color), how many pieces, and by when. Update progress as the floor finishes pieces."
        items={[
          "Create a job — pick product + qty + ready date",
          "Start / +10 made — record progress",
          "Mark done — when planned qty is finished",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Open jobs</div>
          <div className="detail-chip__value">{totals.orders}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Pieces planned</div>
          <div className="detail-chip__value">{totals.planned}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Pieces made</div>
          <div className="detail-chip__value">{totals.done}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">In progress</div>
          <div className="detail-chip__value">{totals.inProgress}</div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">1. Create a production job</h3>
        {formError && <div className="form-error">{formError}</div>}
        <form className="form-grid" onSubmit={handleCreate}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="articleId">What are we making?</label>
            <select
              id="articleId"
              required
              value={articleId}
              onChange={(e) => setArticleId(e.target.value)}
              disabled={loading}
            >
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.sku} — {a.name}
                  {a.color ? ` · ${a.color}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="warehouseId">Which warehouse / floor?</label>
            <select
              id="warehouseId"
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              disabled={loading}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="qtyPlanned">How many pieces?</label>
            <input
              id="qtyPlanned"
              type="number"
              min={1}
              step={1}
              required
              value={qtyPlanned}
              onChange={(e) => setQtyPlanned(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="plannedStart">Start date</label>
            <input
              id="plannedStart"
              type="date"
              value={plannedStart}
              onChange={(e) => setPlannedStart(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="plannedEnd">Ready by (target)</label>
            <input
              id="plannedEnd"
              type="date"
              value={plannedEnd}
              onChange={(e) => setPlannedEnd(e.target.value)}
            />
          </div>

          <div className="form-field form-field--actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
              {submitting ? "Creating…" : "Create production job"}
            </button>
          </div>
        </form>
      </section>

      <div className="form-panel" style={{ paddingBottom: 14 }}>
        <div className="form-field" style={{ maxWidth: 260 }}>
          <label htmlFor="statusFilter">2. Filter jobs by status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All jobs</option>
            <option value="PLANNED">Planned (not started)</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No production jobs yet. Create one above."
        searchPlaceholder="Search order #, product, color…"
        searchKeys={["number", "sku", "articleName", "color", "status", "warehouseName"]}
        getRowKey={(row) => row.id}
        footer={`${filtered.length} job${filtered.length === 1 ? "" : "s"} shown`}
      />
    </>
  );
}
