"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CsvActions } from "@/components/CsvActions";
import { downloadCsv, readCsvFile } from "@/lib/csv";

interface WarehouseRow {
  id: string;
  code: string;
  name: string;
  address: string;
  isActive: boolean;
  locationCount: number;
  zones: number;
  bins: number;
}

interface Location {
  id: string;
  code: string;
  name: string;
  level: string;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [selected, setSelected] = useState<WarehouseRow | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api<
        Array<{
          id: string;
          code: string;
          name: string;
          address?: string | null;
          isActive: boolean;
          locations?: Array<{ id: string; code: string; name: string; level: string }>;
        }>
      >("/warehouses");
      const rows = (Array.isArray(data) ? data : []).map((w) => {
        const locs = w.locations ?? [];
        return {
          id: w.id,
          code: w.code,
          name: w.name,
          address: w.address ?? "—",
          isActive: w.isActive,
          locationCount: locs.length,
          zones: locs.filter((l) => l.level === "ZONE").length,
          bins: locs.filter((l) => l.level === "BIN").length,
        };
      });
      setWarehouses(rows);
      if (rows[0] && !selected) {
        setSelected(rows[0]);
        const first = (Array.isArray(data) ? data : [])[0];
        setLocations(first?.locations ?? []);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectWarehouse(row: WarehouseRow) {
    setSelected(row);
    try {
      const { data } = await api<{
        locations?: Location[];
      }>(`/warehouses/${row.id}`);
      setLocations(Array.isArray(data?.locations) ? data.locations : []);
    } catch {
      setLocations([]);
    }
  }

  function exportWarehouses() {
    downloadCsv(
      "warehouses.csv",
      warehouses.map((w) => ({
        code: w.code,
        name: w.name,
        address: w.address,
        locations: w.locationCount,
        zones: w.zones,
        bins: w.bins,
        status: w.isActive ? "ACTIVE" : "INACTIVE",
      })),
    );
  }

  async function importWarehouses(file: File) {
    const rows = await readCsvFile(file);
    let created = 0;
    for (const row of rows) {
      const code = row.code || row.Code;
      const name = row.name || row.Name;
      if (!code || !name) continue;
      await api("/warehouses", {
        method: "POST",
        body: { code, name, address: row.address || undefined },
      });
      created += 1;
    }
    await load();
    if (created === 0) throw new Error("No valid rows (need code + name)");
  }

  const columns: Column<WarehouseRow>[] = [
    { key: "code", header: "Code", mono: true },
    { key: "name", header: "Name" },
    { key: "address", header: "Address" },
    { key: "locationCount", header: "Locations", mono: true },
    { key: "zones", header: "Zones", mono: true },
    { key: "bins", header: "Bins", mono: true },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
  ];

  const locColumns: Column<Location>[] = [
    { key: "code", header: "Code", mono: true },
    { key: "name", header: "Name" },
    {
      key: "level",
      header: "Level",
      render: (row) => <StatusBadge status={row.level} variant="info" />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Warehouses"
        description="Physical sites and nested storage locations used for putaway, picking, and transfers."
        actions={
          <CsvActions
            onExport={exportWarehouses}
            onImport={importWarehouses}
            templateHint="Import columns: code, name, address"
            disabled={loading}
          />
        }
      />

      <SectionIntro
        eyebrow="Locations"
        title="Hierarchy: Warehouse → Zone → Rack → Shelf → Bin"
        body="Inventory can be pinned to a bin so pickers and receivers know exactly where stock lives. Select a warehouse below to inspect its location tree."
      />

      {error && <div className="alert alert--error">{error}</div>}

      <DataTable
        columns={columns}
        data={warehouses}
        loading={loading}
        emptyMessage="No warehouses configured."
        searchPlaceholder="Search warehouses…"
        searchKeys={["code", "name", "address"]}
        getRowKey={(row) => row.id}
        footer={
          <span>
            {warehouses.length} warehouse{warehouses.length === 1 ? "" : "s"} · click a row
            context via buttons below after loading
          </span>
        }
        toolbar={
          selected ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => selectWarehouse(selected)}
            >
              Refresh locations: {selected.code}
            </button>
          ) : null
        }
      />

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {warehouses.map((w) => (
          <button
            key={w.id}
            type="button"
            className={`btn ${selected?.id === w.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => selectWarehouse(w)}
          >
            {w.code}
          </button>
        ))}
      </div>

      {selected && (
        <section className="form-panel" style={{ marginTop: 20 }}>
          <h3 className="form-panel__title">
            Locations in {selected.name} ({selected.code})
          </h3>
          <DataTable
            columns={locColumns}
            data={locations}
            emptyMessage="No locations under this warehouse."
            searchPlaceholder="Search locations…"
            searchKeys={["code", "name", "level"]}
            getRowKey={(row) => row.id}
            footer={`${locations.length} location${locations.length === 1 ? "" : "s"}`}
          />
        </section>
      )}
    </>
  );
}
