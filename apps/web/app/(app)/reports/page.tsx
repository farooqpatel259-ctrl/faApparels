"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { downloadCsv, CsvRow } from "@/lib/csv";

type ReportId =
  | "stock"
  | "low-stock"
  | "movements"
  | "production"
  | "sorting"
  | "orders"
  | "suppliers";

interface ReportDef {
  id: ReportId;
  title: string;
  plain: string;
  when: string;
  href: string;
}

const REPORTS: ReportDef[] = [
  {
    id: "stock",
    title: "Stock on hand",
    plain: "How many pieces you have right now, by product, color, warehouse, and Available/Reserved.",
    when: "Daily stock check, cycle count prep",
    href: "/inventory",
  },
  {
    id: "low-stock",
    title: "Low stock alert",
    plain: "Products where Available qty is at or below the reorder level — these need buying or making soon.",
    when: "Before placing purchase or production jobs",
    href: "/articles",
  },
  {
    id: "movements",
    title: "Stock movements",
    plain: "What changed recently — receipts, adjustments, reserves. Your audit trail.",
    when: "End of day / investigate a qty mismatch",
    href: "/inventory/movements",
  },
  {
    id: "production",
    title: "Production jobs",
    plain: "What the floor is making: planned vs made, and status.",
    when: "Morning production meeting",
    href: "/production",
  },
  {
    id: "sorting",
    title: "Sorting queue",
    plain: "What still needs sorting, how many pieces, and priority.",
    when: "Sorting supervisor standup",
    href: "/sorting",
  },
  {
    id: "orders",
    title: "Customer orders",
    plain: "Sales orders and where they are: Confirmed → Packed → Dispatched → Delivered.",
    when: "Sales / dispatch follow-up",
    href: "/orders",
  },
  {
    id: "suppliers",
    title: "Suppliers list",
    plain: "Who you buy packaging and trim items from (yarn, label, carton, thread, etc.).",
    when: "Purchasing contacts",
    href: "/purchasing/suppliers",
  },
];

interface Kpis {
  totalArticles: number;
  availableStock: number;
  reservedStock: number;
  lowStockItems: number;
  totalStockValue: number;
  openPurchaseOrders: number;
  transactionsToday: number;
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

export default function ReportsPage() {
  const [active, setActive] = useState<ReportId>("stock");
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeReport = useMemo(
    () => REPORTS.find((r) => r.id === active) ?? REPORTS[0],
    [active],
  );

  useEffect(() => {
    async function loadKpis() {
      try {
        const { data } = await api<Kpis>("/dashboard/kpis");
        setKpis(data);
      } catch {
        /* KPIs are optional on this page */
      }
    }
    loadKpis();
  }, []);

  useEffect(() => {
    loadReport(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function loadReport(id: ReportId) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const data = await fetchReportRows(id);
      setRows(data);
    } catch (err) {
      setRows([]);
      setError(err instanceof ApiError ? err.message : "Could not load this report");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }

  function exportActive() {
    if (rows.length === 0) {
      setError("Nothing to export for this report yet.");
      return;
    }
    const filename = `report-${active}-${new Date().toISOString().slice(0, 10)}.csv`;
    const exportRows = rows.map(({ id: _id, ...rest }) => rest);
    downloadCsv(filename, exportRows);
    setSuccess(`Downloaded ${filename} (${exportRows.length} rows).`);
  }

  const columns: Column<CsvRow>[] = useMemo(() => {
    if (rows.length === 0) {
      return [{ key: "info", header: "Info" }];
    }
    return Object.keys(rows[0])
      .filter((key) => key !== "id")
      .map((key) => ({
        key,
        header: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        mono: ["sku", "qty", "pieces", "available", "reorder_level"].includes(key),
      }));
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Simple answers from your live data — pick a report, read the preview, download CSV for Excel."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={exportActive}
            disabled={busy || loading || rows.length === 0}
          >
            Download CSV
          </button>
        }
      />

      <SectionIntro
        eyebrow="Easy reports"
        title="What is a report?"
        body="A report is a saved view of your data. You do not type formulas — choose what you need, check the preview, then download CSV to open in Excel or WhatsApp to your team."
        items={[
          "Stock & low stock — warehouse truth",
          "Production / sorting / orders — operations status",
          "Download CSV — share or print anytime",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Available pieces</div>
          <div className="detail-chip__value">
            {kpis ? formatNumber(kpis.availableStock) : "—"}
          </div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Reserved</div>
          <div className="detail-chip__value">
            {kpis ? formatNumber(kpis.reservedStock) : "—"}
          </div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Low stock SKUs</div>
          <div className="detail-chip__value">
            {kpis ? formatNumber(kpis.lowStockItems) : "—"}
          </div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Stock value (cost)</div>
          <div className="detail-chip__value">
            {kpis ? formatMoney(kpis.totalStockValue) : "—"}
          </div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">1. Choose a report</h3>
        <div className="report-picker">
          {REPORTS.map((report) => (
            <button
              key={report.id}
              type="button"
              className={`report-picker__item ${
                active === report.id ? "report-picker__item--active" : ""
              }`}
              onClick={() => setActive(report.id)}
            >
              <strong>{report.title}</strong>
              <span>{report.plain}</span>
              <em>Best for: {report.when}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="form-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <h3 className="form-panel__title" style={{ marginBottom: 4 }}>
              2. Preview — {activeReport.title}
            </h3>
            <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>
              {activeReport.plain}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href={activeReport.href} className="btn btn-secondary">
              Open live page
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={exportActive}
              disabled={busy || loading || rows.length === 0}
            >
              Download CSV
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={loading || busy}
          emptyMessage="No rows for this report yet. Add stock, jobs, or orders first."
          searchPlaceholder="Search in this report…"
          searchKeys={Object.keys(rows[0] ?? { info: "" }).filter((k) => k !== "id")}
          getRowKey={(row) => {
            if (row.id != null && row.id !== "") return String(row.id);
            return [
              row.sku,
              row.warehouse,
              row.location,
              row.status,
              row.number,
              row.code,
              row.when,
              row.product,
            ]
              .filter((part) => part != null && part !== "")
              .join("|");
          }}
          footer={`${rows.length} row${rows.length === 1 ? "" : "s"}`}
        />
      </section>
    </>
  );
}

async function fetchReportRows(id: ReportId): Promise<CsvRow[]> {
  switch (id) {
    case "stock": {
      const { data } = await api<
        Array<{
          id: string;
          quantity: string | number;
          status: string;
          article?: { sku: string; name: string; color?: string | null };
          warehouse?: { code: string; name: string };
          location?: { code: string } | null;
        }>
      >("/inventory/balances", { params: { pageSize: 500 } });
      return (Array.isArray(data) ? data : []).map((b) => ({
        id: b.id,
        sku: b.article?.sku ?? "",
        product: b.article?.name ?? "",
        color: b.article?.color ?? "",
        warehouse: b.warehouse?.code ?? "",
        location: b.location?.code ?? "",
        status: b.status,
        qty: Number(b.quantity) || 0,
      }));
    }
    case "low-stock": {
      const [{ data: articles }, { data: balances }] = await Promise.all([
        api<
          Array<{
            id: string;
            sku: string;
            name: string;
            color?: string | null;
            reorderLevel: string | number;
            minStock: string | number;
          }>
        >("/articles"),
        api<
          Array<{
            articleId: string;
            quantity: string | number;
            status: string;
          }>
        >("/inventory/balances", { params: { pageSize: 500 } }),
      ]);
      const articleList = Array.isArray(articles) ? articles : [];
      const balanceList = Array.isArray(balances) ? balances : [];
      const availableByArticle = new Map<string, number>();
      for (const b of balanceList) {
        if (b.status !== "AVAILABLE") continue;
        availableByArticle.set(
          b.articleId,
          (availableByArticle.get(b.articleId) ?? 0) + (Number(b.quantity) || 0),
        );
      }
      return articleList
        .map((a) => {
          const available = availableByArticle.get(a.id) ?? 0;
          const reorder = Number(a.reorderLevel ?? a.minStock ?? 0);
          return {
            id: a.id,
            sku: a.sku,
            product: a.name,
            color: a.color ?? "",
            available,
            reorder_level: reorder,
            shortfall: Math.max(0, reorder - available),
          };
        })
        .filter((r) => r.reorder_level > 0 && r.available <= r.reorder_level)
        .sort((a, b) => b.shortfall - a.shortfall);
    }
    case "movements": {
      const { data } = await api<
        Array<{
          id: string;
          type: string;
          quantity: string | number;
          reason?: string | null;
          createdAt: string;
          article?: { sku: string; name: string };
          warehouse?: { name: string };
          performer?: { fullName: string };
        }>
      >("/inventory/transactions", { params: { pageSize: 200 } });
      return (Array.isArray(data) ? data : []).map((t) => ({
        id: t.id,
        when: t.createdAt,
        type: t.type,
        sku: t.article?.sku ?? "",
        product: t.article?.name ?? "",
        warehouse: t.warehouse?.name ?? "",
        qty: Number(t.quantity) || 0,
        reason: t.reason ?? "",
        by: t.performer?.fullName ?? "",
      }));
    }
    case "production": {
      const { data } = await api<
        Array<{
          number: string;
          status: string;
          qtyPlanned: string | number;
          qtyCompleted: string | number;
          article?: { sku: string; name: string; color?: string | null };
          warehouse?: { name: string };
        }>
      >("/production-orders");
      return (Array.isArray(data) ? data : []).map((o) => ({
        number: o.number,
        sku: o.article?.sku ?? "",
        product: o.article?.name ?? "",
        color: o.article?.color ?? "",
        planned: Number(o.qtyPlanned) || 0,
        made: Number(o.qtyCompleted) || 0,
        status: o.status,
        warehouse: o.warehouse?.name ?? "",
      }));
    }
    case "sorting": {
      const { data } = await api<
        Array<{
          number: string;
          status: string;
          qty: string | number;
          priority: number;
          article?: { sku: string; name: string; color?: string | null };
          warehouse?: { name: string };
        }>
      >("/sorting-orders");
      return (Array.isArray(data) ? data : []).map((o) => ({
        number: o.number,
        sku: o.article?.sku ?? "",
        product: o.article?.name ?? "",
        color: o.article?.color ?? "",
        pieces: Number(o.qty) || 0,
        priority: o.priority >= 3 ? "High" : o.priority === 2 ? "Normal" : "Low",
        status: o.status,
        warehouse: o.warehouse?.name ?? "",
      }));
    }
    case "orders": {
      const { data } = await api<
        Array<{
          number: string;
          status: string;
          orderDate: string;
          customer?: { name: string };
          warehouse?: { name: string };
          items?: Array<{ qtyOrdered: string | number }>;
        }>
      >("/sales-orders");
      return (Array.isArray(data) ? data : []).map((o) => ({
        number: o.number,
        date: o.orderDate,
        customer: o.customer?.name ?? "",
        pieces: (o.items ?? []).reduce(
          (sum, item) => sum + (Number(item.qtyOrdered) || 0),
          0,
        ),
        status: o.status,
        ship_from: o.warehouse?.name ?? "",
      }));
    }
    case "suppliers": {
      const { data } = await api<
        Array<{
          code: string;
          name: string;
          contactName?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          isActive: boolean;
        }>
      >("/suppliers");
      return (Array.isArray(data) ? data : []).map((s) => ({
        code: s.code,
        name: s.name,
        contact: s.contactName ?? "",
        phone: s.phone ?? "",
        email: s.email ?? "",
        address: s.address ?? "",
        active: s.isActive ? "Yes" : "No",
      }));
    }
    default:
      return [];
  }
}
