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
  locations?: Array<{ id: string; code: string; name: string }>;
}

interface SortingRow {
  id: string;
  number: string;
  sku: string;
  articleName: string;
  color: string;
  warehouseName: string;
  locationCode: string;
  qty: number;
  priority: number;
  priorityLabel: string;
  status: string;
}

const PRIORITY_OPTIONS = [
  { value: 3, label: "High — do first" },
  { value: 2, label: "Normal" },
  { value: 1, label: "Low — when free" },
] as const;

function priorityLabel(priority: number): string {
  if (priority >= 3) return "High";
  if (priority === 2) return "Normal";
  return "Low";
}

export default function SortingPage() {
  const [orders, setOrders] = useState<SortingRow[]>([]);
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
  const [locationId, setLocationId] = useState("");
  const [qty, setQty] = useState("40");
  const [priority, setPriority] = useState("2");

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
            qty: string | number;
            priority: number;
            article?: { sku: string; name: string; color?: string | null };
            warehouse?: { name: string };
            location?: { code: string } | null;
          }>
        >("/sorting-orders"),
        api<ArticleOption[]>("/articles"),
        api<WarehouseOption[]>("/warehouses"),
      ]);

      const articleList = Array.isArray(articlesRes.data) ? articlesRes.data : [];
      setArticles(articleList);

      const warehouseList = Array.isArray(warehousesRes.data)
        ? warehousesRes.data
        : [];
      setWarehouses(warehouseList);

      setOrders(
        (Array.isArray(ordersRes.data) ? ordersRes.data : []).map((o) => {
          const p = Number(o.priority) || 0;
          return {
            id: o.id,
            number: o.number,
            sku: o.article?.sku ?? "—",
            articleName: o.article?.name ?? "—",
            color: o.article?.color?.trim() ? o.article.color : "—",
            warehouseName: o.warehouse?.name ?? "—",
            locationCode: o.location?.code ?? "—",
            qty: Number(o.qty) || 0,
            priority: p,
            priorityLabel: priorityLabel(p),
            status: o.status,
          };
        }),
      );

      if (!articleId && articleList[0]) setArticleId(articleList[0].id);
      if (!warehouseId && warehouseList[0]) setWarehouseId(warehouseList[0].id);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load sorting queue",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === warehouseId),
    [warehouses, warehouseId],
  );

  const locations = useMemo(() => {
    const list = selectedWarehouse?.locations ?? [];
    return [...list].sort((a, b) => a.code.localeCompare(b.code));
  }, [selectedWarehouse]);

  useEffect(() => {
    if (!locations.length) {
      setLocationId("");
      return;
    }
    if (!locations.some((l) => l.id === locationId)) {
      setLocationId(locations[0].id);
    }
  }, [locations, locationId]);

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter],
  );

  const totals = useMemo(() => {
    let pieces = 0;
    let pending = 0;
    let inProgress = 0;
    let high = 0;
    for (const o of orders) {
      pieces += o.qty;
      if (o.status === "PENDING") pending += 1;
      if (o.status === "IN_PROGRESS") inProgress += 1;
      if (o.priority >= 3 && o.status !== "COMPLETED" && o.status !== "CANCELLED") {
        high += 1;
      }
    }
    return { jobs: orders.length, pieces, pending, inProgress, high };
  }, [orders]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const quantity = Number(qty);
    if (!articleId || !warehouseId) {
      setFormError("Choose a product and warehouse.");
      return;
    }
    if (!quantity || quantity <= 0) {
      setFormError("Enter how many pieces need sorting.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await api<{ number: string }>("/sorting-orders", {
        method: "POST",
        body: {
          articleId,
          warehouseId,
          locationId: locationId || undefined,
          qty: quantity,
          priority: Number(priority) || 1,
        },
      });
      setSuccess(
        `Sorting job ${created.data.number} added to the queue. Start it when a sorter is free.`,
      );
      setQty("40");
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create job");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(order: SortingRow, status: string) {
    setFormError(null);
    try {
      await api(`/sorting-orders/${order.id}`, {
        method: "PATCH",
        body: { status },
      });
      setSuccess(`${order.number} marked as ${status.replace(/_/g, " ")}.`);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function bumpPriority(order: SortingRow) {
    setFormError(null);
    try {
      await api(`/sorting-orders/${order.id}`, {
        method: "PATCH",
        body: { priority: 3 },
      });
      setSuccess(`${order.number} moved to High priority.`);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Priority update failed");
    }
  }

  const columns: Column<SortingRow>[] = [
    { key: "number", header: "Job #", mono: true },
    { key: "sku", header: "SKU", mono: true },
    { key: "articleName", header: "Product" },
    { key: "color", header: "Color" },
    { key: "qty", header: "Pieces", mono: true },
    {
      key: "priorityLabel",
      header: "Priority",
      render: (row) => (
        <StatusBadge
          status={row.priorityLabel}
          variant={
            row.priority >= 3 ? "danger" : row.priority === 2 ? "warning" : "neutral"
          }
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "locationCode", header: "Location", mono: true },
    { key: "warehouseName", header: "Warehouse" },
    {
      key: "id",
      header: "Quick actions",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {row.status === "PENDING" && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "4px 8px", fontSize: 12 }}
              onClick={() => setStatus(row, "IN_PROGRESS")}
            >
              Start sorting
            </button>
          )}
          {row.status === "IN_PROGRESS" && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: "4px 8px", fontSize: 12 }}
              onClick={() => setStatus(row, "COMPLETED")}
            >
              Mark sorted
            </button>
          )}
          {(row.status === "PENDING" || row.status === "IN_PROGRESS") &&
            row.priority < 3 && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => bumpPriority(row)}
              >
                Make urgent
              </button>
            )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sorting"
        description="A simple queue of products that need to be sorted — by color, size, or quality — before they go to Available stock."
      />

      <SectionIntro
        eyebrow="Sorting queue"
        title="What is sorting?"
        body="After goods arrive or come from production, they often need sorting (size/color check, fold, count). Add a job to the queue, start it, then mark it sorted when finished."
        items={[
          "Add to queue — product + how many pieces + priority",
          "Start sorting — someone is working on it now",
          "Mark sorted — job is done; High priority jobs appear first",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Jobs in queue</div>
          <div className="detail-chip__value">{totals.jobs}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Pieces to sort</div>
          <div className="detail-chip__value">{totals.pieces}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Waiting</div>
          <div className="detail-chip__value">{totals.pending}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Urgent (high)</div>
          <div className="detail-chip__value">{totals.high}</div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">1. Add something to the sorting queue</h3>
        {formError && <div className="form-error">{formError}</div>}
        <form className="form-grid" onSubmit={handleCreate}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="articleId">Which product needs sorting?</label>
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
            <label htmlFor="warehouseId">Warehouse</label>
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
            <label htmlFor="locationId">Where is it sitting?</label>
            <select
              id="locationId"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={loading || locations.length === 0}
            >
              {locations.length === 0 && <option value="">No locations</option>}
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="qty">How many pieces?</label>
            <input
              id="qty"
              type="number"
              min={1}
              step={1}
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field form-field--actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
              {submitting ? "Adding…" : "Add to sorting queue"}
            </button>
          </div>
        </form>
      </section>

      <div className="form-panel" style={{ paddingBottom: 14 }}>
        <div className="form-field" style={{ maxWidth: 280 }}>
          <label htmlFor="statusFilter">2. Filter the queue</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All jobs</option>
            <option value="PENDING">Waiting (not started)</option>
            <option value="IN_PROGRESS">Being sorted now</option>
            <option value="COMPLETED">Finished</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="Sorting queue is empty. Add a job above."
        searchPlaceholder="Search job #, product, color…"
        searchKeys={[
          "number",
          "sku",
          "articleName",
          "color",
          "status",
          "priorityLabel",
          "warehouseName",
        ]}
        getRowKey={(row) => row.id}
        footer={`${filtered.length} job${filtered.length === 1 ? "" : "s"} shown · high priority listed first`}
      />
    </>
  );
}
