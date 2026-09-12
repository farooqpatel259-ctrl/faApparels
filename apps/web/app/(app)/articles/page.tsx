"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CsvActions } from "@/components/CsvActions";
import { downloadCsv, readCsvFile } from "@/lib/csv";

interface ArticleRow {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  color: string;
  unitCode: string;
  minStock: string;
  reorderLevel: string;
  costPrice: string;
  sellingPrice: string;
  isActive: boolean;
}

interface Category {
  id: string;
  code: string;
  name: string;
}

interface Unit {
  id: string;
  code: string;
  name: string;
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [minStock, setMinStock] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [sellingPrice, setSellingPrice] = useState("0");

  async function loadArticles() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api<
        Array<{
          id: string;
          sku: string;
          name: string;
          color?: string | null;
          isActive: boolean;
          minStock: string | number;
          reorderLevel: string | number;
          costPrice: string | number;
          sellingPrice: string | number;
          category?: { name: string };
          unit?: { code: string };
        }>
      >("/articles");
      setArticles(
        (Array.isArray(data) ? data : []).map((a) => ({
          id: a.id,
          sku: a.sku,
          name: a.name,
          categoryName: a.category?.name ?? "—",
          color: a.color?.trim() ? a.color : "—",
          unitCode: a.unit?.code ?? "—",
          minStock: String(a.minStock ?? 0),
          reorderLevel: String(a.reorderLevel ?? 0),
          costPrice: String(a.costPrice ?? 0),
          sellingPrice: String(a.sellingPrice ?? 0),
          isActive: a.isActive,
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load articles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const [cats, unitRes] = await Promise.all([
          api<Category[]>("/categories"),
          api<Unit[]>("/units"),
        ]);
        setCategories(Array.isArray(cats.data) ? cats.data : []);
        const unitList = Array.isArray(unitRes.data) ? unitRes.data : [];
        setUnits(unitList);
        if (cats.data?.[0]) setCategoryId(cats.data[0].id);
        if (unitList[0]) setUnitId(unitList[0].id);
      } catch {
        /* ignore boot meta errors */
      }
      await loadArticles();
    }
    boot();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api("/articles", {
        method: "POST",
        body: {
          sku,
          name,
          categoryId,
          unitId,
          minStock: Number(minStock) || 0,
          reorderLevel: Number(reorderLevel) || 0,
          costPrice: Number(costPrice) || 0,
          sellingPrice: Number(sellingPrice) || 0,
        },
      });
      setSku("");
      setName("");
      await loadArticles();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to create article");
    } finally {
      setSubmitting(false);
    }
  }

  function exportArticles() {
    downloadCsv(
      "articles.csv",
      articles.map((a) => ({
        sku: a.sku,
        name: a.name,
        category: a.categoryName,
        unit: a.unitCode,
        min_stock: a.minStock,
        reorder_level: a.reorderLevel,
        cost_price: a.costPrice,
        selling_price: a.sellingPrice,
        status: a.isActive ? "ACTIVE" : "INACTIVE",
      })),
    );
  }

  async function importArticles(file: File) {
    const rows = await readCsvFile(file);
    if (rows.length === 0) throw new Error("CSV has no data rows");
    const defaultCategory = categoryId || categories[0]?.id;
    const defaultUnit = unitId || units[0]?.id;
    if (!defaultCategory || !defaultUnit) {
      throw new Error("Load categories and units before importing");
    }

    let created = 0;
    for (const row of rows) {
      const rowSku = row.sku || row.SKU || row.code;
      const rowName = row.name || row.Name;
      if (!rowSku || !rowName) continue;
      const cat =
        categories.find(
          (c) =>
            c.code.toLowerCase() === (row.category_code || "").toLowerCase() ||
            c.name.toLowerCase() === (row.category || "").toLowerCase(),
        )?.id ?? defaultCategory;
      const unit =
        units.find(
          (u) =>
            u.code.toLowerCase() === (row.unit || row.unit_code || "").toLowerCase(),
        )?.id ?? defaultUnit;
      await api("/articles", {
        method: "POST",
        body: {
          sku: rowSku,
          name: rowName,
          categoryId: cat,
          unitId: unit,
          minStock: Number(row.min_stock || 0),
          reorderLevel: Number(row.reorder_level || 0),
          costPrice: Number(row.cost_price || 0),
          sellingPrice: Number(row.selling_price || 0),
        },
      });
      created += 1;
    }
    await loadArticles();
    if (created === 0) throw new Error("No valid rows (need sku + name columns)");
  }

  const columns: Column<ArticleRow>[] = [
    { key: "sku", header: "SKU", mono: true },
    { key: "name", header: "Name" },
    { key: "color", header: "Color" },
    { key: "categoryName", header: "Category" },
    { key: "unitCode", header: "Unit", mono: true },
    { key: "minStock", header: "Min", mono: true },
    { key: "reorderLevel", header: "Reorder", mono: true },
    { key: "costPrice", header: "Cost", mono: true },
    { key: "sellingPrice", header: "Sell", mono: true },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
  ];

  const activeCount = articles.filter((a) => a.isActive).length;

  return (
    <>
      <PageHeader
        title="Articles"
        description="Product master for every trackable SKU — reorder rules, costing, and category classification."
        actions={
          <CsvActions
            onExport={exportArticles}
            onImport={importArticles}
            templateHint="Import columns: sku, name, category, unit, min_stock, reorder_level, cost_price, selling_price"
            disabled={loading}
          />
        }
      />

      <SectionIntro
        eyebrow="Master data"
        title="What this section manages"
        body="Each article (or variant) is the foundation of inventory, purchasing, production, and orders. Duplicate SKUs are blocked. Reorder level drives low-stock signals on the dashboard."
        items={[
          "Unique SKU and optional barcode",
          "Category / unit of measure",
          "Min stock, reorder level, and pricing",
          "CSV import for bulk article creation",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Total articles</div>
          <div className="detail-chip__value">{articles.length}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Active</div>
          <div className="detail-chip__value">{activeCount}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Categories</div>
          <div className="detail-chip__value">{categories.length}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Units</div>
          <div className="detail-chip__value">{units.length}</div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">Create article</h3>
        {formError && <div className="form-error">{formError}</div>}
        <form className="form-grid" onSubmit={handleCreate}>
          <div className="form-field">
            <label htmlFor="sku">SKU</label>
            <input id="sku" required value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="name">Name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="categoryId">Category</label>
            <select id="categoryId" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="unitId">Unit</label>
            <select id="unitId" required value={unitId} onChange={(e) => setUnitId(e.target.value)}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.code}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="minStock">Min stock</label>
            <input id="minStock" type="number" min={0} step="any" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="reorderLevel">Reorder level</label>
            <input id="reorderLevel" type="number" min={0} step="any" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="costPrice">Cost price</label>
            <input id="costPrice" type="number" min={0} step="any" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="sellingPrice">Selling price</label>
            <input id="sellingPrice" type="number" min={0} step="any" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
          </div>
          <div className="form-field form-field--actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Create article"}
            </button>
          </div>
        </form>
      </section>

      <DataTable
        columns={columns}
        data={articles}
        loading={loading}
        emptyMessage="No articles yet. Create one or import a CSV."
        searchPlaceholder="Search SKU, name, category…"
        searchKeys={["sku", "name", "categoryName", "color", "unitCode"]}
        getRowKey={(row) => row.id}
        footer={`${articles.length} article${articles.length === 1 ? "" : "s"}`}
      />
    </>
  );
}
