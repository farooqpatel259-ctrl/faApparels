"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { CsvActions } from "@/components/CsvActions";
import { downloadCsv } from "@/lib/csv";
import { StatusBadge } from "@/components/StatusBadge";

interface DashboardKpis {
  totalArticles: number;
  totalQuantity: number;
  availableStock: number;
  reservedStock: number;
  productionStock: number;
  sortingPending: number;
  damagedStock: number;
  lowStockItems: number;
  warehouseCount: number;
  openPurchaseOrders: number;
  transactionsToday: number;
  totalStockValue: number;
}

interface TxRow {
  id: string;
  type: string;
  quantity: string | number;
  createdAt: string;
  article?: { sku: string; name: string };
  warehouse?: { name: string };
  performer?: { fullName: string };
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-PK").format(n);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKpis | null>(null);
  const [recent, setRecent] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [kpiRes, txRes] = await Promise.all([
          api<DashboardKpis>("/dashboard/kpis"),
          api<TxRow[] | { data: TxRow[] }>("/inventory/transactions", {
            params: { page: 1, pageSize: 8 },
          }),
        ]);
        setKpis(kpiRes.data);
        const txData = Array.isArray(txRes.data)
          ? txRes.data
          : Array.isArray((txRes.data as { data?: TxRow[] })?.data)
            ? (txRes.data as { data: TxRow[] }).data
            : [];
        setRecent(txData.slice(0, 8));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stockBars = useMemo(() => {
    if (!kpis) return [];
    const items = [
      { label: "Available", value: kpis.availableStock, tone: "success" as const },
      { label: "Reserved", value: kpis.reservedStock, tone: "accent" as const },
      { label: "Production", value: kpis.productionStock, tone: "accent" as const },
      { label: "Sorting", value: kpis.sortingPending, tone: "warning" as const },
      { label: "Damaged", value: kpis.damagedStock, tone: "danger" as const },
    ];
    const max = Math.max(...items.map((i) => i.value), 1);
    return items.map((i) => ({ ...i, pct: Math.round((i.value / max) * 100) }));
  }, [kpis]);

  function exportDashboard() {
    if (!kpis) return;
    downloadCsv("dashboard-kpis.csv", [
      {
        metric: "total_articles",
        value: kpis.totalArticles,
      },
      { metric: "total_quantity", value: kpis.totalQuantity },
      { metric: "available_stock", value: kpis.availableStock },
      { metric: "reserved_stock", value: kpis.reservedStock },
      { metric: "production_stock", value: kpis.productionStock },
      { metric: "sorting_pending", value: kpis.sortingPending },
      { metric: "damaged_stock", value: kpis.damagedStock },
      { metric: "low_stock_items", value: kpis.lowStockItems },
      { metric: "warehouses", value: kpis.warehouseCount },
      { metric: "open_purchase_orders", value: kpis.openPurchaseOrders },
      { metric: "transactions_today", value: kpis.transactionsToday },
      { metric: "stock_value_pkr", value: kpis.totalStockValue },
    ]);
  }

  if (loading) {
    return (
      <div className="page-loading" style={{ minHeight: 320 }}>
        <span className="spinner" /> Loading operations dashboard…
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Operations dashboard"
        description="Live inventory health across stock status, purchasing pipeline, warehouses, and today’s ledger activity. Figures are derived from balances and transactions — not duplicated counters."
        actions={
          <CsvActions
            onExport={exportDashboard}
            exportLabel="Export KPIs CSV"
            disabled={!kpis}
          />
        }
      />

      {error && <div className="alert alert--error">{error}</div>}

      {kpis && (
        <>
          <div className="kpi-grid">
            <KpiCard
              label="Available stock"
              value={formatNumber(kpis.availableStock)}
              hint="Ready to reserve / issue"
              tone="success"
            />
            <KpiCard
              label="Reserved"
              value={formatNumber(kpis.reservedStock)}
              hint="Held for orders"
              tone="accent"
            />
            <KpiCard
              label="In production"
              value={formatNumber(kpis.productionStock)}
              hint="WIP quantity"
              tone="accent"
            />
            <KpiCard
              label="Sorting pending"
              value={formatNumber(kpis.sortingPending)}
              hint="Awaiting sort queue"
              tone="warning"
            />
            <KpiCard
              label="Damaged"
              value={formatNumber(kpis.damagedStock)}
              hint="Not available"
              tone="danger"
            />
            <KpiCard
              label="Low stock articles"
              value={formatNumber(kpis.lowStockItems)}
              hint="At or below reorder level"
              tone={kpis.lowStockItems > 0 ? "warning" : "default"}
            />
            <KpiCard
              label="Stock value"
              value={formatMoney(kpis.totalStockValue)}
              hint="Available × standard cost"
              tone="accent"
            />
            <KpiCard
              label="Open POs"
              value={formatNumber(kpis.openPurchaseOrders)}
              hint="Expected inbound"
            />
            <KpiCard
              label="Warehouses"
              value={formatNumber(kpis.warehouseCount)}
              hint="Active sites"
            />
            <KpiCard
              label="Articles"
              value={formatNumber(kpis.totalArticles)}
              hint="Active SKUs"
            />
            <KpiCard
              label="Total on-hand"
              value={formatNumber(kpis.totalQuantity)}
              hint="All status buckets"
            />
            <KpiCard
              label="Txns today"
              value={formatNumber(kpis.transactionsToday)}
              hint="Ledger entries since midnight"
            />
          </div>

          <div className="dashboard-grid">
            <section className="dashboard-panel">
              <h2 className="dashboard-panel__title">Stock by status</h2>
              <p className="dashboard-panel__sub">
                Relative distribution of current inventory quantities. Available stock is
                the only bucket counted toward ATP by default.
              </p>
              <div className="bar-list">
                {stockBars.map((bar) => (
                  <div key={bar.label} className="bar-row">
                    <span className="bar-row__label">{bar.label}</span>
                    <div className="bar-track">
                      <div
                        className={`bar-fill${
                          bar.tone === "success"
                            ? " bar-fill--success"
                            : bar.tone === "warning"
                              ? " bar-fill--warning"
                              : bar.tone === "danger"
                                ? " bar-fill--danger"
                                : ""
                        }`}
                        style={{ width: `${bar.pct}%` }}
                      />
                    </div>
                    <span className="bar-row__value">{formatNumber(bar.value)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="dashboard-panel">
              <h2 className="dashboard-panel__title">Recent ledger activity</h2>
              <p className="dashboard-panel__sub">
                Latest inventory transactions across receiving, adjustments, and
                reservations.
              </p>
              {recent.length === 0 ? (
                <p className="dashboard-panel__sub" style={{ margin: 0 }}>
                  No movements yet. Receive stock against a PO to populate the ledger.
                </p>
              ) : (
                <ul className="activity-list">
                  {recent.map((tx) => (
                    <li key={tx.id} className="activity-item">
                      <div>
                        <div className="activity-item__title">
                          {tx.article?.sku ?? "—"} · {tx.type.replace(/_/g, " ")}
                        </div>
                        <div className="activity-item__meta">
                          Qty {String(tx.quantity)}
                          {tx.warehouse?.name ? ` · ${tx.warehouse.name}` : ""}
                          {tx.performer?.fullName ? ` · ${tx.performer.fullName}` : ""}
                        </div>
                      </div>
                      <div className="activity-item__time">
                        <StatusBadge status={tx.type} variant="info" />
                        <div style={{ marginTop: 6 }}>{formatTime(tx.createdAt)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="dashboard-panel" style={{ marginBottom: 0 }}>
            <h2 className="dashboard-panel__title">Jump into work</h2>
            <p className="dashboard-panel__sub">
              Common operational paths for warehouse and inventory teams.
            </p>
            <div className="quick-links">
              <Link className="quick-link" href="/inventory">
                <p className="quick-link__title">Inventory balances</p>
                <p className="quick-link__desc">Where stock sits by status & location</p>
              </Link>
              <Link className="quick-link" href="/purchasing/receiving">
                <p className="quick-link__title">Receive goods</p>
                <p className="quick-link__desc">Putaway into available inventory</p>
              </Link>
              <Link className="quick-link" href="/articles">
                <p className="quick-link__title">Article master</p>
                <p className="quick-link__desc">SKUs, min/reorder levels, pricing</p>
              </Link>
              <Link className="quick-link" href="/inventory/movements">
                <p className="quick-link__title">Movement ledger</p>
                <p className="quick-link__desc">Full auditable transaction history</p>
              </Link>
              <Link className="quick-link" href="/purchasing/orders">
                <p className="quick-link__title">Purchase orders</p>
                <p className="quick-link__desc">Expected inbound & pending qty</p>
              </Link>
              <Link className="quick-link" href="/warehouses">
                <p className="quick-link__title">Warehouses</p>
                <p className="quick-link__desc">Sites and location hierarchy</p>
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
