"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CsvActions } from "@/components/CsvActions";
import { downloadCsv } from "@/lib/csv";

interface BalanceRow {
  id: string;
  sku: string;
  articleName: string;
  color: string;
  imageUrl: string;
  sellingPrice: number;
  costPrice: number;
  warehouseName: string;
  warehouseCode: string;
  locationCode: string;
  status: string;
  quantity: string;
}

interface GarmentCard {
  sku: string;
  name: string;
  color: string;
  imageUrl: string;
  sellingPrice: number;
  availableQty: number;
  reservedQty: number;
}

const GARMENT_IMAGES: Record<string, string> = {
  ZIP: "/garments/zipper-hoodie.svg",
  HDY: "/garments/hoodie.svg",
  CRW: "/garments/crewneck.svg",
  TEE: "/garments/tee.svg",
  SHT: "/garments/shorts.svg",
  PNT: "/garments/pants.svg",
};

function garmentImageForSku(sku: string): string {
  const prefix = sku.split("-")[0];
  return GARMENT_IMAGES[prefix] ?? "/garments/tee.svg";
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function InventoryBalancesPage() {
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [productFilter, setProductFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api<
          Array<{
            id: string;
            quantity: string | number;
            status: string;
            article?: {
              sku: string;
              name: string;
              color?: string | null;
              sellingPrice?: string | number;
              costPrice?: string | number;
            };
            warehouse?: { name: string; code: string };
            location?: { code: string } | null;
          }>
        >("/inventory/balances", { params: { pageSize: 500 } });
        const rows = Array.isArray(data) ? data : [];
        setBalances(
          rows.map((b) => {
            const sku = b.article?.sku ?? "—";
            return {
              id: b.id,
              sku,
              articleName: b.article?.name ?? "—",
              color: b.article?.color?.trim() ? b.article.color : "—",
              imageUrl: garmentImageForSku(sku),
              sellingPrice: Number(b.article?.sellingPrice ?? 0),
              costPrice: Number(b.article?.costPrice ?? 0),
              warehouseName: b.warehouse?.name ?? "—",
              warehouseCode: b.warehouse?.code ?? "—",
              locationCode: b.location?.code ?? "—",
              status: b.status,
              quantity: String(b.quantity),
            };
          }),
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load balances");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const productLines = useMemo(() => {
    const map: Record<string, string> = {
      ZIP: "Zipper Hoodie",
      HDY: "Pullover Hoodie",
      CRW: "Crewneck",
      TEE: "Tees",
      SHT: "Shorts",
      PNT: "Pants",
    };
    return Object.entries(map);
  }, []);

  const filtered = useMemo(() => {
    return balances.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (productFilter !== "ALL" && !b.sku.startsWith(`${productFilter}-`)) {
        return false;
      }
      return true;
    });
  }, [balances, statusFilter, productFilter]);

  const garments = useMemo(() => {
    const map = new Map<string, GarmentCard>();
    for (const b of filtered) {
      if (!/^(ZIP|HDY|CRW|TEE|SHT|PNT)-/.test(b.sku)) continue;
      const existing = map.get(b.sku) ?? {
        sku: b.sku,
        name: b.articleName,
        color: b.color,
        imageUrl: b.imageUrl,
        sellingPrice: b.sellingPrice,
        availableQty: 0,
        reservedQty: 0,
      };
      const qty = Number(b.quantity) || 0;
      if (b.status === "AVAILABLE") existing.availableQty += qty;
      if (b.status === "RESERVED") existing.reservedQty += qty;
      existing.sellingPrice = b.sellingPrice || existing.sellingPrice;
      map.set(b.sku, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.sku.localeCompare(b.sku));
  }, [filtered]);

  const totals = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let pieces = 0;
    for (const b of balances) {
      const q = Number(b.quantity) || 0;
      pieces += q;
      byStatus[b.status] = (byStatus[b.status] ?? 0) + q;
    }
    return { pieces, byStatus, lines: balances.length };
  }, [balances]);

  const statuses = useMemo(
    () => Array.from(new Set(balances.map((b) => b.status))).sort(),
    [balances],
  );

  function exportBalances() {
    downloadCsv(
      "inventory-balances.csv",
      filtered.map((b) => ({
        sku: b.sku,
        article: b.articleName,
        color: b.color,
        selling_price: b.sellingPrice,
        warehouse: b.warehouseName,
        warehouse_code: b.warehouseCode,
        location: b.locationCode,
        status: b.status,
        quantity: b.quantity,
      })),
    );
  }

  const columns: Column<BalanceRow>[] = [
    {
      key: "imageUrl",
      header: "Pic",
      render: (row) =>
        /^(ZIP|HDY|CRW|TEE|SHT|PNT)-/.test(row.sku) ? (
          <img
            src={row.imageUrl}
            alt={row.articleName}
            className="garment-thumb"
          />
        ) : (
          <span className="mono">—</span>
        ),
    },
    { key: "sku", header: "SKU", mono: true },
    { key: "articleName", header: "Article" },
    { key: "color", header: "Color" },
    {
      key: "sellingPrice",
      header: "Price",
      mono: true,
      render: (row) => (row.sellingPrice > 0 ? formatMoney(row.sellingPrice) : "—"),
    },
    { key: "warehouseCode", header: "WH", mono: true },
    { key: "warehouseName", header: "Warehouse" },
    { key: "locationCode", header: "Location", mono: true },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    { key: "quantity", header: "Qty", mono: true },
  ];

  return (
    <>
      <PageHeader
        title="Inventory balances"
        description="Garment pictures with prices, plus stock by warehouse, location, and status."
        actions={
          <CsvActions onExport={exportBalances} exportLabel="Export CSV" disabled={loading} />
        }
      />

      <SectionIntro
        eyebrow="Core inventory"
        title="See the garment, price, and stock together"
        body="Browse FA Apparels styles with a picture and selling price. The table below still shows full warehouse detail."
        items={[
          "Picture + price for zipper, hoodie, crewneck, tee, shorts, pants",
          "Available qty is sellable stock",
          "Filter by product line or status",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Balance lines</div>
          <div className="detail-chip__value">{totals.lines}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Total pieces</div>
          <div className="detail-chip__value">{totals.pieces}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Available</div>
          <div className="detail-chip__value">{totals.byStatus.AVAILABLE ?? 0}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Reserved</div>
          <div className="detail-chip__value">{totals.byStatus.RESERVED ?? 0}</div>
        </div>
      </div>

      <div className="form-panel" style={{ paddingBottom: 14 }}>
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div className="form-field">
            <label htmlFor="productFilter">Product</label>
            <select
              id="productFilter"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            >
              <option value="ALL">All products</option>
              {productLines.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="statusFilter">Status</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">Garments with price</h3>
        {loading ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading garments…</p>
        ) : garments.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
            No garment stock for this filter.
          </p>
        ) : (
          <div className="garment-grid">
            {garments.map((g) => (
              <article key={g.sku} className="garment-card">
                <img src={g.imageUrl} alt={g.name} className="garment-card__img" />
                <div className="garment-card__body">
                  <div className="garment-card__sku">{g.sku}</div>
                  <h4 className="garment-card__name">{g.name}</h4>
                  <div className="garment-card__color">Color: {g.color}</div>
                  <div className="garment-card__price">{formatMoney(g.sellingPrice)}</div>
                  <div className="garment-card__stock">
                    Available {g.availableQty}
                    {g.reservedQty > 0 ? ` · Reserved ${g.reservedQty}` : ""}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No inventory balances yet. Receive stock to create the first positions."
        searchPlaceholder="Search SKU, color, warehouse…"
        searchKeys={["sku", "articleName", "color", "warehouseName", "locationCode", "status"]}
        getRowKey={(row) => row.id}
        footer={`${filtered.length} line${filtered.length === 1 ? "" : "s"} shown`}
      />
    </>
  );
}
