"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CsvActions } from "@/components/CsvActions";
import { downloadCsv } from "@/lib/csv";

interface PoRow {
  id: string;
  number: string;
  supplierName: string;
  warehouseName: string;
  status: string;
  orderDate: string;
  expectedDate: string;
  lineCount: number;
  qtyOrdered: number;
  qtyReceived: number;
  qtyPending: number;
  notes: string;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface Article {
  id: string;
  sku: string;
  name: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PoRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [articleId, setArticleId] = useState("");
  const [qtyOrdered, setQtyOrdered] = useState("100");
  const [unitCost, setUnitCost] = useState("0");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [poRes, supRes, whRes, artRes] = await Promise.all([
        api<
          Array<{
            id: string;
            number: string;
            status: string;
            orderDate: string;
            expectedDate?: string | null;
            notes?: string | null;
            supplier?: { name: string };
            warehouse?: { name: string };
            items?: Array<{ qtyOrdered: string | number; qtyReceived: string | number }>;
          }>
        >("/purchase-orders"),
        api<Supplier[]>("/suppliers"),
        api<Warehouse[]>("/warehouses"),
        api<Article[]>("/articles"),
      ]);

      setOrders(
        (Array.isArray(poRes.data) ? poRes.data : []).map((po) => {
          const items = po.items ?? [];
          const ordered = items.reduce((s, i) => s + Number(i.qtyOrdered), 0);
          const received = items.reduce((s, i) => s + Number(i.qtyReceived), 0);
          return {
            id: po.id,
            number: po.number,
            supplierName: po.supplier?.name ?? "—",
            warehouseName: po.warehouse?.name ?? "—",
            status: po.status,
            orderDate: po.orderDate,
            expectedDate: po.expectedDate ?? "",
            lineCount: items.length,
            qtyOrdered: ordered,
            qtyReceived: received,
            qtyPending: Math.max(ordered - received, 0),
            notes: po.notes ?? "—",
          };
        }),
      );
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
      setWarehouses(Array.isArray(whRes.data) ? whRes.data : []);
      setArticles(Array.isArray(artRes.data) ? artRes.data : []);
      if (!supplierId && supRes.data?.[0]) setSupplierId(supRes.data[0].id);
      if (!warehouseId && whRes.data?.[0]) setWarehouseId(whRes.data[0].id);
      if (!articleId && artRes.data?.[0]) setArticleId(artRes.data[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    return {
      open: orders.filter((o) => ["OPEN", "PARTIAL", "DRAFT"].includes(o.status)).length,
      pendingQty: orders.reduce((s, o) => s + o.qtyPending, 0),
    };
  }, [orders]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api("/purchase-orders", {
        method: "POST",
        body: {
          supplierId,
          warehouseId,
          expectedDate: expectedDate || undefined,
          notes: notes || undefined,
          items: [
            {
              articleId,
              qtyOrdered: Number(qtyOrdered),
              unitCost: Number(unitCost) || 0,
            },
          ],
        },
      });
      setNotes("");
      setQtyOrdered("100");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  }

  function exportPos() {
    downloadCsv(
      "purchase-orders.csv",
      orders.map((o) => ({
        number: o.number,
        supplier: o.supplierName,
        warehouse: o.warehouseName,
        status: o.status,
        order_date: o.orderDate,
        expected_date: o.expectedDate,
        lines: o.lineCount,
        qty_ordered: o.qtyOrdered,
        qty_received: o.qtyReceived,
        qty_pending: o.qtyPending,
        notes: o.notes,
      })),
    );
  }

  const columns: Column<PoRow>[] = [
    { key: "number", header: "PO #", mono: true },
    { key: "supplierName", header: "Supplier" },
    { key: "warehouseName", header: "Warehouse" },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "orderDate",
      header: "Ordered",
      render: (row) => formatDate(row.orderDate),
    },
    {
      key: "expectedDate",
      header: "Expected",
      render: (row) => formatDate(row.expectedDate),
    },
    { key: "lineCount", header: "Lines", mono: true },
    { key: "qtyOrdered", header: "Ordered", mono: true },
    { key: "qtyReceived", header: "Received", mono: true },
    { key: "qtyPending", header: "Pending", mono: true },
  ];

  return (
    <>
      <PageHeader
        title="Purchase orders"
        description="Expected inbound inventory. Pending quantity = ordered − received (supports partial receipts)."
        actions={<CsvActions onExport={exportPos} disabled={loading} />}
      />

      <SectionIntro
        eyebrow="Inbound"
        title="Plan what should arrive"
        body="Create POs against suppliers and warehouses. Receiving updates line qty received and PO status (OPEN → PARTIAL → RECEIVED)."
        items={[
          "Partial receiving is supported",
          "Dashboard low-stock can drive replenishment recommendations later",
          "Export open POs for purchasing follow-up",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Purchase orders</div>
          <div className="detail-chip__value">{orders.length}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Open / partial</div>
          <div className="detail-chip__value">{summary.open}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Pending qty</div>
          <div className="detail-chip__value">{summary.pendingQty}</div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">Create purchase order (single line)</h3>
        {formError && <div className="form-error">{formError}</div>}
        <form className="form-grid" onSubmit={handleCreate}>
          <div className="form-field">
            <label htmlFor="supplierId">Supplier</label>
            <select id="supplierId" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="warehouseId">Warehouse</label>
            <select id="warehouseId" required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="articleId">Article</label>
            <select id="articleId" required value={articleId} onChange={(e) => setArticleId(e.target.value)}>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>{a.sku} — {a.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="qtyOrdered">Qty ordered</label>
            <input id="qtyOrdered" type="number" min={0.0001} step="any" required value={qtyOrdered} onChange={(e) => setQtyOrdered(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="unitCost">Unit cost</label>
            <input id="unitCost" type="number" min={0} step="any" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="expectedDate">Expected date</label>
            <input id="expectedDate" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
          <div className="form-field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="form-field form-field--actions">
            <button type="submit" className="btn btn-primary" disabled={submitting || !supplierId || !articleId}>
              {submitting ? "Creating…" : "Create PO"}
            </button>
          </div>
        </form>
      </section>

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyMessage="No purchase orders yet."
        searchPlaceholder="Search PO, supplier, status…"
        searchKeys={["number", "supplierName", "warehouseName", "status"]}
        getRowKey={(row) => row.id}
        footer={`${orders.length} purchase order${orders.length === 1 ? "" : "s"}`}
      />
    </>
  );
}
