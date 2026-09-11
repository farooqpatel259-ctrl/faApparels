"use client";

import { useMemo, useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  mono?: boolean;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  getRowKey: (row: T) => string;
  footer?: React.ReactNode;
  toolbar?: React.ReactNode;
}

export function DataTable<T extends object>({
  columns,
  data,
  loading = false,
  emptyMessage = "No records found.",
  searchPlaceholder = "Search…",
  searchKeys,
  getRowKey,
  footer,
  toolbar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    const keys = searchKeys ?? (Object.keys(data[0] ?? {}) as (keyof T)[]);

    return data.filter((row) =>
      keys.some((key) => {
        const val = (row as Record<string, unknown>)[key as string];
        return val != null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, search, searchKeys]);

  return (
    <div className="data-table-wrapper">
      <div className="data-table-toolbar">
        <div className="data-table-search">
          <span className="data-table-search__icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search table"
          />
        </div>
        {toolbar}
      </div>

      {loading ? (
        <div className="data-table-loading">
          <span className="spinner" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="data-table-empty">{emptyMessage}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={getRowKey(row)}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.mono ? "mono" : undefined}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {footer && <div className="data-table-footer">{footer}</div>}
    </div>
  );
}
