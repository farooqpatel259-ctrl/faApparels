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

interface BalanceRow {
  id: string;
  quantity: number;
  status: string;
  articleId: string;
  warehouseId: string;
  locationId: string | null;
  sku: string;
  articleName: string;
  color: string;
  warehouseCode: string;
  locationCode: string;
}

interface AdjustmentRow {
  id: string;
  sku: string;
  articleName: string;
  warehouseName: string;
  locationCode: string;
  quantity: string;
  direction: string;
  balanceAfter: string;
  reason: string;
  performer: string;
  createdAt: string;
}

const REASONS = [
  { value: "Cycle count correction", label: "Cycle count — counted qty is different" },
  { value: "Found stock", label: "Found stock — items discovered in warehouse" },
  { value: "Damaged goods", label: "Damaged — write off broken / unsellable items" },
  { value: "Lost / missing", label: "Lost / missing — shrinkage" },
  { value: "Data correction", label: "Data fix — wrong entry earlier" },
  { value: "Opening balance", label: "Opening balance — first-time stock entry" },
  { value: "Other", label: "Other — explain in notes" },
] as const;

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

export default function StockAdjustmentsPage() {
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [recent, setRecent] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [articleId, setArticleId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("AVAILABLE");
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [notes, setNotes] = useState("");

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [articlesRes, warehousesRes, balancesRes, txRes] = await Promise.all([
        api<ArticleOption[]>("/articles"),
        api<WarehouseOption[]>("/warehouses"),
        api<
          Array<{
            id: string;
            quantity: string | number;
            status: string;
            articleId: string;
            warehouseId: string;
            locationId?: string | null;
            article?: { sku: string; name: string; color?: string | null };
            warehouse?: { code: string };
            location?: { code: string } | null;
          }>
        >("/inventory/balances", { params: { pageSize: 500 } }),
        api<
          Array<{
            id: string;
            type: string;
            quantity: string | number;
            balanceAfter?: string | number | null;
            fromStatus?: string | null;
            toStatus?: string | null;
            reason?: string | null;
            createdAt: string;
            article?: { sku: string; name: string };
            warehouse?: { name: string };
            location?: { code: string } | null;
            performer?: { fullName: string };
          }>
        >("/inventory/transactions", { params: { type: "ADJUSTMENT", pageSize: 100 } }),
      ]);

      const articleList = Array.isArray(articlesRes.data) ? articlesRes.data : [];
      setArticles(articleList);

      const warehouseList = Array.isArray(warehousesRes.data) ? warehousesRes.data : [];
      setWarehouses(warehouseList);

      setBalances(
        (Array.isArray(balancesRes.data) ? balancesRes.data : []).map((b) => ({
          id: b.id,
          quantity: Number(b.quantity) || 0,
          status: b.status,
          articleId: b.articleId,
          warehouseId: b.warehouseId,
          locationId: b.locationId ?? null,
          sku: b.article?.sku ?? "—",
          articleName: b.article?.name ?? "—",
          color: b.article?.color?.trim() ? b.article.color : "—",
          warehouseCode: b.warehouse?.code ?? "—",
          locationCode: b.location?.code ?? "—",
        })),
      );

      setRecent(
        (Array.isArray(txRes.data) ? txRes.data : [])
          .filter((t) => t.type === "ADJUSTMENT")
          .map((t) => {
            const qty = Number(t.quantity) || 0;
            const isDecrease = Boolean(t.fromStatus) && !t.toStatus;
            return {
              id: t.id,
              sku: t.article?.sku ?? "—",
              articleName: t.article?.name ?? "—",
              warehouseName: t.warehouse?.name ?? "—",
              locationCode: t.location?.code ?? "—",
              quantity: String(qty),
              direction: isDecrease ? "Removed" : "Added",
              balanceAfter: t.balanceAfter != null ? String(t.balanceAfter) : "—",
              reason: t.reason ?? "—",
              performer: t.performer?.fullName ?? "—",
              createdAt: t.createdAt,
            };
          }),
      );

      if (!articleId && articleList[0]) setArticleId(articleList[0].id);
      if (!warehouseId && warehouseList[0]) setWarehouseId(warehouseList[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load adjustment data");
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
    return [...list].sort((a, b) => {
      const score = (code: string) =>
        code.includes("B1") || code.includes("-B") ? 0 : code.includes("RECV") ? 1 : 2;
      return score(a.code) - score(b.code) || a.code.localeCompare(b.code);
    });
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

  const currentBalance = useMemo(() => {
    return balances.find(
      (b) =>
        b.articleId === articleId &&
        b.warehouseId === warehouseId &&
        (b.locationId ?? "") === (locationId || "") &&
        b.status === status,
    );
  }, [balances, articleId, warehouseId, locationId, status]);

  const currentQty = currentBalance?.quantity ?? 0;
  const qtyNum = Number(quantity) || 0;
  const delta = direction === "increase" ? qtyNum : -qtyNum;
  const projectedQty = currentQty + delta;

  const selectedArticle = articles.find((a) => a.id === articleId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!articleId || !warehouseId) {
      setFormError("Choose a product and warehouse.");
      return;
    }
    if (qtyNum <= 0) {
      setFormError("Enter how many pieces to add or remove (must be greater than 0).");
      return;
    }
    if (direction === "decrease" && qtyNum > currentQty) {
      setFormError(
        `You only have ${currentQty} in this location. You cannot remove ${qtyNum}.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await api("/inventory/operations/adjust", {
        method: "POST",
        body: {
          articleId,
          warehouseId,
          locationId: locationId || undefined,
          status,
          quantityDelta: delta,
          reason,
          notes: notes.trim() || undefined,
          referenceType: "MANUAL_ADJUSTMENT",
        },
      });
      const label = selectedArticle
        ? `${selectedArticle.name}${selectedArticle.color ? ` (${selectedArticle.color})` : ""}`
        : "product";
      setSuccess(
        direction === "increase"
          ? `Added ${qtyNum} to ${label}. New qty: ${projectedQty}.`
          : `Removed ${qtyNum} from ${label}. New qty: ${projectedQty}.`,
      );
      setQuantity("1");
      setNotes("");
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Adjustment failed");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<AdjustmentRow>[] = [
    {
      key: "createdAt",
      header: "When",
      render: (row) => formatDate(row.createdAt),
    },
    { key: "sku", header: "SKU", mono: true },
    { key: "articleName", header: "Product" },
    {
      key: "direction",
      header: "Change",
      render: (row) => (
        <StatusBadge
          status={row.direction}
          variant={row.direction === "Added" ? "success" : "warning"}
        />
      ),
    },
    { key: "quantity", header: "Qty", mono: true },
    { key: "balanceAfter", header: "Qty after", mono: true },
    { key: "reason", header: "Why" },
    { key: "performer", header: "By" },
  ];

  return (
    <>
      <PageHeader
        title="Stock adjustments"
        description="Fix stock when the system number does not match what is actually on the shelf."
      />

      <SectionIntro
        eyebrow="Simple corrections"
        title="When do I use this?"
        body="Use Adjustments only to correct stock — not for receiving purchases or fulfilling sales. Pick a product, say if you are adding or removing pieces, and choose why."
        items={[
          "Add — found extra stock or opening balance",
          "Remove — damaged, lost, or count was too high",
          "Every change is saved in Movements for audit",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Current qty (this spot)</div>
          <div className="detail-chip__value">{loading ? "…" : currentQty}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">You will change by</div>
          <div className="detail-chip__value">
            {delta > 0 ? `+${delta}` : delta}
          </div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Qty after save</div>
          <div className="detail-chip__value">
            {projectedQty < 0 ? "Invalid" : projectedQty}
          </div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Recent adjustments</div>
          <div className="detail-chip__value">{recent.length}</div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">1. What are you correcting?</h3>
        {formError && <div className="form-error">{formError}</div>}
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="articleId">Product (with color)</label>
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
            <label htmlFor="locationId">Location (bin / shelf)</label>
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
            <label htmlFor="status">Stock bucket</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="AVAILABLE">Available (sellable)</option>
              <option value="RESERVED">Reserved (held)</option>
              <option value="DAMAGED">Damaged</option>
            </select>
          </div>

          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <span className="form-field__legend">2. Add or remove?</span>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
              <button
                type="button"
                className={`btn ${direction === "increase" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setDirection("increase")}
              >
                Add stock (+)
              </button>
              <button
                type="button"
                className={`btn ${direction === "decrease" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setDirection("decrease")}
              >
                Remove stock (−)
              </button>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="quantity">How many pieces?</label>
            <input
              id="quantity"
              type="number"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="reason">3. Why?</label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example: Shelf A-1 count was 36, system showed 40"
            />
          </div>

          <div className="form-field form-field--actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
              {submitting
                ? "Saving…"
                : direction === "increase"
                  ? `Add ${qtyNum || 0} pieces`
                  : `Remove ${qtyNum || 0} pieces`}
            </button>
          </div>
        </form>
      </section>

      <h3 className="section-intro__title" style={{ fontSize: "1.05rem", margin: "24px 0 8px" }}>
        Recent adjustments
      </h3>
      <p className="section-intro__body" style={{ marginBottom: 12 }}>
        Only manual corrections appear here. Purchase receipts and sales show under Movements.
      </p>

      <DataTable
        columns={columns}
        data={recent}
        loading={loading}
        emptyMessage="No adjustments yet. Make your first correction above."
        searchPlaceholder="Search product, reason…"
        searchKeys={["sku", "articleName", "reason", "direction", "performer"]}
        getRowKey={(row) => row.id}
        footer={`${recent.length} adjustment${recent.length === 1 ? "" : "s"}`}
      />
    </>
  );
}
