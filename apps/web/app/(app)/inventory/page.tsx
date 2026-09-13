"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  ZIP: "/garments/zipper-hoodie.png?v=2",
  HDY: "/garments/hoodie.png?v=2",
  CRW: "/garments/crewneck.png?v=2",
  TEE: "/garments/tee.png?v=2",
  SHT: "/garments/shorts.png?v=2",
  PNT: "/garments/pants.png?v=2",
};

const COLOR_HEX: Record<string, string> = {
  Black: "#1a1a1a",
  White: "#f3f3f3",
  Navy: "#1b2a4a",
  Grey: "#8a8a8a",
  Olive: "#556b2f",
  Red: "#b91c1c",
  Beige: "#d4c4a8",
  Khaki: "#c3b091",
  Charcoal: "#36454f",
  Forest: "#1f4d3a",
  Sand: "#c2b280",
  Burgundy: "#6b1e2a",
};

function garmentImageForSku(sku: string): string {
  const prefix = sku.split("-")[0];
  return GARMENT_IMAGES[prefix] ?? "/garments/tee.png?v=2";
}

function colorHex(color: string): string {
  return COLOR_HEX[color] ?? "#9ca3af";
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function GarmentPhoto({
  src,
  color,
  alt,
  className = "",
}: {
  src: string;
  color: string;
  alt: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    let cancelled = false;

    img.onload = () => {
      if (cancelled) return;

      // Work at a capped size so recolor stays sharp and fast
      const maxW = 480;
      const scale = Math.min(1, maxW / (img.naturalWidth || img.width || maxW));
      const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const d = imageData.data;
      const [tr, tg, tb] = hexToRgb(colorHex(color));
      const isWhite = color === "White";
      const total = width * height;
      const bg = new Uint8Array(total);

      const lumAt = (i: number) => {
        const o = i * 4;
        return 0.2126 * d[o] + 0.7152 * d[o + 1] + 0.0722 * d[o + 2];
      };
      const satAt = (i: number) => {
        const o = i * 4;
        const r = d[o];
        const g = d[o + 1];
        const b = d[o + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        return max === 0 ? 0 : (max - min) / max;
      };
      // Only wipe pixels connected to the frame (true studio bg), never fabric speckles
      const isBgSeed = (i: number) => {
        const lum = lumAt(i);
        const sat = satAt(i);
        return lum >= 198 && sat < 0.28;
      };

      const queue = new Int32Array(total);
      let qh = 0;
      let qt = 0;
      const push = (i: number) => {
        if (bg[i]) return;
        if (!isBgSeed(i)) return;
        bg[i] = 1;
        queue[qt++] = i;
      };

      for (let x = 0; x < width; x++) {
        push(x);
        push((height - 1) * width + x);
      }
      for (let y = 0; y < height; y++) {
        push(y * width);
        push(y * width + width - 1);
      }

      while (qh < qt) {
        const i = queue[qh++];
        const x = i % width;
        const y = (i / width) | 0;
        if (x > 0) push(i - 1);
        if (x + 1 < width) push(i + 1);
        if (y > 0) push(i - width);
        if (y + 1 < height) push(i + width);
      }

      // Soften the garment/background edge once (removes colored fringe)
      const edge = new Uint8Array(total);
      for (let i = 0; i < total; i++) {
        if (bg[i]) continue;
        const x = i % width;
        const y = (i / width) | 0;
        const nearBg =
          (x > 0 && bg[i - 1]) ||
          (x + 1 < width && bg[i + 1]) ||
          (y > 0 && bg[i - width]) ||
          (y + 1 < height && bg[i + width]);
        if (nearBg && lumAt(i) > 170) edge[i] = 1;
      }
      for (let i = 0; i < total; i++) {
        if (edge[i]) bg[i] = 1;
      }

      for (let i = 0; i < total; i++) {
        const o = i * 4;
        if (bg[i]) {
          d[o] = 255;
          d[o + 1] = 255;
          d[o + 2] = 255;
          d[o + 3] = 255;
          continue;
        }

        const lum = lumAt(i);
        // Keep fabric texture continuous (no white holes inside the garment)
        const shade = Math.max(0.18, Math.min(0.98, lum / 255));

        if (isWhite) {
          const v = Math.round(215 + shade * 40);
          d[o] = v;
          d[o + 1] = v;
          d[o + 2] = v;
          continue;
        }

        d[o] = Math.round(tr * shade);
        d[o + 1] = Math.round(tg * shade);
        d[o + 2] = Math.round(tb * shade);
      }

      ctx.putImageData(imageData, 0, 0);
    };

    img.onerror = () => {
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = 300;
      canvas.height = 400;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 300, 400);
    };

    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, color]);

  return (
    <div className={`garment-media ${className}`.trim()}>
      <canvas ref={canvasRef} className="garment-media__img" role="img" aria-label={alt} />
    </div>
  );
}

function ColorSwatch({ color }: { color: string }) {
  if (!color || color === "—") return <span>{color || "—"}</span>;
  return (
    <span className="garment-card__color">
      <span
        className="garment-card__swatch"
        style={{ background: colorHex(color) }}
        aria-hidden
      />
      {color}
    </span>
  );
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
          <GarmentPhoto
            src={row.imageUrl}
            color={row.color}
            alt={row.articleName}
            className="garment-thumb"
          />
        ) : (
          <span className="mono">—</span>
        ),
    },
    { key: "sku", header: "SKU", mono: true },
    { key: "articleName", header: "Article" },
    {
      key: "color",
      header: "Color",
      render: (row) => <ColorSwatch color={row.color} />,
    },
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
                <GarmentPhoto
                  src={g.imageUrl}
                  color={g.color}
                  alt={`${g.name} — ${g.color}`}
                  className="garment-card__media"
                />
                <div className="garment-card__body">
                  <div className="garment-card__sku">{g.sku}</div>
                  <h4 className="garment-card__name">{g.name}</h4>
                  <ColorSwatch color={g.color} />
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
