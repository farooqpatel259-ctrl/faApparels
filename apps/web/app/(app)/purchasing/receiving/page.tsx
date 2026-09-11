"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CsvActions } from "@/components/CsvActions";
import { downloadCsv } from "@/lib/csv";

interface PoOption {
  id: string;
  number: string;
  supplierName: string;
  warehouseId: string;
  warehouseName: string;
  status: string;
  items: Array<{
    articleId: string;
    sku: string;
    name: string;
    qtyOrdered: number;
    qtyReceived: number;
    pending: number;
  }>;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
  locations?: Array<{ id: string; code: string; name: string; level: string }>;
}

interface ReceivingRow {
  id: string;
  number: string;
  poNumber: string;
  warehouseName: string;
  status: string;
  receivedAt: string;
  receiver: string;
  itemCount: number;
  qtyAccepted: number;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ReceivingPage() {
  const [pos, setPos] = useState<PoOption[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [receivings, setReceivings] = useState<ReceivingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [poId, setPoId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [lineQty, setLineQty] = useState<Record<string, string>>({});

  const selectedPo = pos.find((p) => p.id === poId);
  const selectedWh = warehouses.find((w) => w.id === warehouseId);
  const locations = selectedWh?.locations ?? [];

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [poRes, whRes, recvRes] = await Promise.all([
        api<
          Array<{
            id: string;
            number: string;
            status: string;
            warehouseId: string;
            supplier?: { name: string };
            warehouse?: { name: string };
            items?: Array<{
              articleId: string;
              qtyOrdered: string | number;
              qtyReceived: string | number;
              article?: { sku: string; name: string };
            }>;
          }>
        >("/purchase-orders"),
        api<Warehouse[]>("/warehouses"),
        api<
          Array<{
            id: string;
            number: string;
            status: string;
            receivedAt: string;
            purchaseOrder?: { number: string } | null;
            warehouse?: { name: string };
            receiver?: { fullName: string };
            items?: Array<{ qtyAccepted: string | number }>;
          }>
        >("/receivings"),
      ]);

      const openPos = (Array.isArray(poRes.data) ? poRes.data : [])
        .filter((p) => ["OPEN", "PARTIAL", "DRAFT"].includes(p.status))
        .map((p) => ({
          id: p.id,
          number: p.number,
          supplierName: p.supplier?.name ?? "—",
          warehouseId: p.warehouseId,
          warehouseName: p.warehouse?.name ?? "—",
          status: p.status,
          items: (p.items ?? []).map((i) => {
            const ordered = Number(i.qtyOrdered);
            const received = Number(i.qtyReceived);
            return {
              articleId: i.articleId,
              sku: i.article?.sku ?? "—",
              name: i.article?.name ?? "—",
              qtyOrdered: ordered,
              qtyReceived: received,
              pending: Math.max(ordered - received, 0),
            };
          }),
        }));
      setPos(openPos);
      setWarehouses(Array.isArray(whRes.data) ? whRes.data : []);
      setReceivings(
        (Array.isArray(recvRes.data) ? recvRes.data : []).map((r) => ({
          id: r.id,
          number: r.number,
          poNumber: r.purchaseOrder?.number ?? "—",
          warehouseName: r.warehouse?.name ?? "—",
          status: r.status,
          receivedAt: r.receivedAt,
          receiver: r.receiver?.fullName ?? "—",
          itemCount: r.items?.length ?? 0,
          qtyAccepted: (r.items ?? []).reduce((s, i) => s + Number(i.qtyAccepted), 0),
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load receiving data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedPo) return;
    setWarehouseId(selectedPo.warehouseId);
    const next: Record<string, string> = {};
    for (const item of selectedPo.items) {
      next[item.articleId] = String(item.pending > 0 ? item.pending : 0);
    }
    setLineQty(next);
  }, [selectedPo]);

  async function handleReceive(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      if (!selectedPo) throw new Error("Select a purchase order");
      const items = selectedPo.items
        .map((item) => ({
          articleId: item.articleId,
          qtyAccepted: Number(lineQty[item.articleId] || 0),
        }))
        .filter((i) => i.qtyAccepted > 0);
      if (items.length === 0) throw new Error("Enter at least one accepted quantity");

      await api("/receivings", {
        method: "POST",
        body: {
          purchaseOrderId: poId,
          warehouseId,
          locationId: locationId || undefined,
          notes: notes || undefined,
          items,
        },
      });
      setSuccess("Receiving posted. Accepted quantity put away as AVAILABLE.");
      setNotes("");
      setPoId("");
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create receiving");
    } finally {
      setSubmitting(false);
    }
  }

  function exportReceivings() {
    downloadCsv(
      "receivings.csv",
      receivings.map((r) => ({
        number: r.number,
        purchase_order: r.poNumber,
        warehouse: r.warehouseName,
        status: r.status,
        received_at: r.receivedAt,
        received_by: r.receiver,
        lines: r.itemCount,
        qty_accepted: r.qtyAccepted,
      })),
    );
  }

  const receivingColumns: Column<ReceivingRow>[] = [
    { key: "number", header: "Receipt #", mono: true },
    { key: "poNumber", header: "PO", mono: true },
    { key: "warehouseName", header: "Warehouse" },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "receivedAt",
      header: "Received",
      render: (row) => formatDate(row.receivedAt),
    },
    { key: "receiver", header: "By" },
    { key: "itemCount", header: "Lines", mono: true },
    { key: "qtyAccepted", header: "Accepted qty", mono: true },
  ];

  return (
    <>
      <PageHeader
        title="Receiving"
        description="Receive against open POs, choose putaway location, and post accepted quantity into AVAILABLE stock."
        actions={<CsvActions onExport={exportReceivings} disabled={loading} />}
      />

      <SectionIntro
        eyebrow="Inbound process"
        title="Expected → Received → Putaway"
        body="Accepted quantities create inventory transactions and update PO line received qty. Rejected quantities can be recorded separately in a later QC step."
        items={[
          "Supports partial receipts",
          "Writes PUTAWAY ledger entries",
          "Never silently changes balances",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Open POs</div>
          <div className="detail-chip__value">{pos.length}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Receipts</div>
          <div className="detail-chip__value">{receivings.length}</div>
        </div>
      </div>

      <div className="form-panel">
        <h3 className="form-panel__title">Post receiving</h3>
        {formError && <div className="form-error">{formError}</div>}
        {success && <div className="alert alert--success">{success}</div>}
        <form onSubmit={handleReceive}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="poId">Purchase order</label>
              <select id="poId" required value={poId} onChange={(e) => setPoId(e.target.value)}>
                <option value="">Select open PO…</option>
                {pos.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.number} — {po.supplierName} ({po.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="warehouseId">Warehouse</label>
              <select id="warehouseId" required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                <option value="">Select…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="locationId">Putaway location</label>
              <select id="locationId" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">None / warehouse level</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.code} ({l.level}) — {l.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery note, carrier, condition…" />
            </div>
          </div>

          {selectedPo && (
            <div style={{ marginTop: 16 }}>
              <h4 className="form-panel__title" style={{ marginBottom: 8 }}>
                Lines — enter accepted qty
              </h4>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Article</th>
                      <th>Ordered</th>
                      <th>Received</th>
                      <th>Pending</th>
                      <th>Accept now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPo.items.map((item) => (
                      <tr key={item.articleId}>
                        <td className="mono">{item.sku}</td>
                        <td>{item.name}</td>
                        <td className="mono">{item.qtyOrdered}</td>
                        <td className="mono">{item.qtyReceived}</td>
                        <td className="mono">{item.pending}</td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            step="any"
                            style={{ width: 100 }}
                            value={lineQty[item.articleId] ?? "0"}
                            onChange={(e) =>
                              setLineQty((prev) => ({
                                ...prev,
                                [item.articleId]: e.target.value,
                              }))
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting || !poId}>
              {submitting ? "Posting…" : "Post receiving"}
            </button>
          </div>
        </form>
      </div>

      <DataTable
        columns={receivingColumns}
        data={receivings}
        loading={loading}
        emptyMessage="No receivings recorded yet."
        searchPlaceholder="Search receipts…"
        searchKeys={["number", "poNumber", "warehouseName", "receiver", "status"]}
        getRowKey={(row) => row.id}
        footer={`${receivings.length} receiving record${receivings.length === 1 ? "" : "s"}`}
      />
    </>
  );
}
