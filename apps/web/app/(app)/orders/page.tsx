"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";

interface CustomerOption {
  id: string;
  code: string;
  name: string;
}

interface ArticleOption {
  id: string;
  sku: string;
  name: string;
  color?: string | null;
  sellingPrice?: string | number;
}

interface WarehouseOption {
  id: string;
  code: string;
  name: string;
}

interface OrderRow {
  id: string;
  number: string;
  customerName: string;
  warehouseName: string;
  productSummary: string;
  pieces: number;
  status: string;
  orderDate: string;
}

const NEXT_STEP: Record<string, { status: string; label: string } | null> = {
  DRAFT: { status: "CONFIRMED", label: "Confirm order" },
  CONFIRMED: { status: "PACKED", label: "Mark packed" },
  PACKED: { status: "DISPATCHED", label: "Dispatch" },
  DISPATCHED: { status: "DELIVERED", label: "Mark delivered" },
  DELIVERED: null,
  CANCELLED: null,
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [articleId, setArticleId] = useState("");
  const [qty, setQty] = useState("10");
  const [notes, setNotes] = useState("");

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, customersRes, articlesRes, warehousesRes] =
        await Promise.all([
          api<
            Array<{
              id: string;
              number: string;
              status: string;
              orderDate: string;
              customer?: { name: string };
              warehouse?: { name: string };
              items?: Array<{
                qtyOrdered: string | number;
                article?: { sku: string; name: string; color?: string | null };
              }>;
            }>
          >("/sales-orders"),
          api<CustomerOption[]>("/customers"),
          api<ArticleOption[]>("/articles"),
          api<WarehouseOption[]>("/warehouses"),
        ]);

      const customerList = Array.isArray(customersRes.data)
        ? customersRes.data
        : [];
      setCustomers(customerList);

      const articleList = Array.isArray(articlesRes.data) ? articlesRes.data : [];
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
          const items = o.items ?? [];
          const pieces = items.reduce(
            (sum, item) => sum + (Number(item.qtyOrdered) || 0),
            0,
          );
          const productSummary =
            items.length === 0
              ? "—"
              : items.length === 1
                ? `${items[0].article?.sku ?? ""} ${items[0].article?.name ?? ""}${
                    items[0].article?.color ? ` · ${items[0].article.color}` : ""
                  }`.trim()
                : `${items.length} products`;
          return {
            id: o.id,
            number: o.number,
            customerName: o.customer?.name ?? "—",
            warehouseName: o.warehouse?.name ?? "—",
            productSummary,
            pieces,
            status: o.status,
            orderDate: formatDate(o.orderDate),
          };
        }),
      );

      if (!customerId && customerList[0]) setCustomerId(customerList[0].id);
      if (!warehouseId && warehouseList[0]) setWarehouseId(warehouseList[0].id);
      if (!articleId && apparelFirst[0]) setArticleId(apparelFirst[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === articleId),
    [articles, articleId],
  );

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? orders
        : orders.filter((o) => o.status === statusFilter),
    [orders, statusFilter],
  );

  const totals = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let pieces = 0;
    for (const o of orders) {
      pieces += o.pieces;
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    }
    return {
      orders: orders.length,
      pieces,
      open:
        (byStatus.DRAFT ?? 0) +
        (byStatus.CONFIRMED ?? 0) +
        (byStatus.PACKED ?? 0) +
        (byStatus.DISPATCHED ?? 0),
      delivered: byStatus.DELIVERED ?? 0,
    };
  }, [orders]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const quantity = Number(qty);
    if (!customerId || !warehouseId || !articleId) {
      setFormError("Choose customer, warehouse, and product.");
      return;
    }
    if (!quantity || quantity <= 0) {
      setFormError("Enter how many pieces the customer wants.");
      return;
    }

    setSubmitting(true);
    try {
      const unitPrice = Number(selectedArticle?.sellingPrice) || 0;
      const created = await api<{ number: string }>("/sales-orders", {
        method: "POST",
        body: {
          customerId,
          warehouseId,
          notes: notes.trim() || undefined,
          items: [
            {
              articleId,
              qtyOrdered: quantity,
              unitPrice,
            },
          ],
        },
      });
      setSuccess(
        `Order ${created.data.number} created. Next: pack it, then dispatch, then mark delivered.`,
      );
      setQty("10");
      setNotes("");
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create order");
    } finally {
      setSubmitting(false);
    }
  }

  async function advance(order: OrderRow) {
    const next = NEXT_STEP[order.status];
    if (!next) return;
    setFormError(null);
    try {
      await api(`/sales-orders/${order.id}`, {
        method: "PATCH",
        body: { status: next.status },
      });
      setSuccess(`${order.number} → ${next.status.replace(/_/g, " ")}`);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function cancelOrder(order: OrderRow) {
    setFormError(null);
    try {
      await api(`/sales-orders/${order.id}`, {
        method: "PATCH",
        body: { status: "CANCELLED" },
      });
      setSuccess(`${order.number} cancelled.`);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Cancel failed");
    }
  }

  const columns: Column<OrderRow>[] = [
    { key: "number", header: "Order #", mono: true },
    { key: "orderDate", header: "Date" },
    { key: "customerName", header: "Customer (buyer)" },
    { key: "productSummary", header: "Product" },
    { key: "pieces", header: "Pieces", mono: true },
    { key: "warehouseName", header: "Ship from" },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "id",
      header: "Next step",
      render: (row) => {
        const next = NEXT_STEP[row.status];
        return (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {next && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => advance(row)}
              >
                {next.label}
              </button>
            )}
            {row.status !== "DELIVERED" && row.status !== "CANCELLED" && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "4px 8px", fontSize: 12 }}
                onClick={() => cancelOrder(row)}
              >
                Cancel
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        description="Customer sales orders — from confirmed request to packed, dispatched, and delivered."
      />

      <SectionIntro
        eyebrow="Sales orders"
        title="How orders work"
        body="An order is what a customer (buyer) wants. Create it, then move it through simple steps: Confirmed → Packed → Dispatched → Delivered."
        items={[
          "Create — who is buying, what product/color, how many",
          "Pack → Dispatch → Deliver — one button per step",
          "Cancel — if the order should not ship",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Total orders</div>
          <div className="detail-chip__value">{totals.orders}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Pieces ordered</div>
          <div className="detail-chip__value">{totals.pieces}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Still open</div>
          <div className="detail-chip__value">{totals.open}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Delivered</div>
          <div className="detail-chip__value">{totals.delivered}</div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">1. Create a customer order</h3>
        {formError && <div className="form-error">{formError}</div>}
        <form className="form-grid" onSubmit={handleCreate}>
          <div className="form-field">
            <label htmlFor="customerId">Who is buying?</label>
            <select
              id="customerId"
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={loading || customers.length === 0}
            >
              {customers.length === 0 && (
                <option value="">No customers yet</option>
              )}
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="warehouseId">Ship from warehouse</label>
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

          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="articleId">Which product?</label>
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

          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example: Deliver before Friday / call before dispatch"
            />
          </div>

          <div className="form-field form-field--actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
              {submitting ? "Creating…" : "Create order"}
            </button>
          </div>
        </form>
      </section>

      <div className="form-panel" style={{ paddingBottom: 14 }}>
        <div className="form-field" style={{ maxWidth: 280 }}>
          <label htmlFor="statusFilter">2. Filter orders</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All orders</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PACKED">Packed</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No sales orders yet. Create one above."
        searchPlaceholder="Search order #, customer, product…"
        searchKeys={["number", "customerName", "productSummary", "status", "warehouseName"]}
        getRowKey={(row) => row.id}
        footer={`${filtered.length} order${filtered.length === 1 ? "" : "s"} shown`}
      />
    </>
  );
}
