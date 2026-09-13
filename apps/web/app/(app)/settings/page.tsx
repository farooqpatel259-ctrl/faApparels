"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import {
  DEFAULT_MOBILE_API_URL,
  getApiBaseUrl,
  setStoredApiUrl,
} from "@/lib/config";

interface SettingRow {
  id: string;
  key: string;
  value: string;
  label: string;
  help: string;
  group: string;
}

const SETTING_META: Record<string, { label: string; help: string; group: string }> = {
  "company.name": {
    label: "Company name",
    help: "Shown as your business name on the ops console.",
    group: "Company",
  },
  "company.city": {
    label: "City",
    help: "Main operating city.",
    group: "Company",
  },
  "company.timezone": {
    label: "Timezone",
    help: "Used for dates and “today” on the dashboard.",
    group: "Company",
  },
  "company.currency": {
    label: "Currency",
    help: "Money format for stock value (example: PKR).",
    group: "Company",
  },
  "inventory.available_statuses": {
    label: "Sellable stock statuses",
    help: "Which stock buckets count as Available to promise. Keep as [\"AVAILABLE\"] unless you know otherwise.",
    group: "Inventory rules",
  },
  "inventory.low_stock_note": {
    label: "Low-stock rule (note)",
    help: "Reminder text for how low-stock alerts work.",
    group: "Inventory rules",
  },
  "documents.po_prefix": {
    label: "Purchase order number prefix",
    help: "Example: PO-000001",
    group: "Document numbers",
  },
  "documents.so_prefix": {
    label: "Sales order number prefix",
    help: "Example: SO-000001",
    group: "Document numbers",
  },
  "documents.prd_prefix": {
    label: "Production job prefix",
    help: "Example: PRD-000001",
    group: "Document numbers",
  },
  "documents.srt_prefix": {
    label: "Sorting job prefix",
    help: "Example: SRT-000001",
    group: "Document numbers",
  },
};

function describeKey(key: string): { label: string; help: string; group: string } {
  if (SETTING_META[key]) return SETTING_META[key];
  if (key.startsWith("inventory.status.")) {
    return {
      label: `Status code: ${key.replace("inventory.status.", "")}`,
      help: "Built-in inventory status used by the system. Usually leave as-is.",
      group: "Inventory status codes",
    };
  }
  return {
    label: key,
    help: "Advanced setting key.",
    group: "Other",
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [apiUrl, setApiUrl] = useState(DEFAULT_MOBILE_API_URL);
  const [apiSaved, setApiSaved] = useState<string | null>(null);

  useEffect(() => {
    setApiUrl(getApiBaseUrl());
  }, []);

  function saveApiUrl(e: FormEvent) {
    e.preventDefault();
    let value = apiUrl.trim();
    if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
    value = value.replace(/\/$/, "");
    if (!value.endsWith("/api/v1")) {
      value = value.replace(/\/$/, "") + (value.includes(":4000") ? "/api/v1" : ":4000/api/v1");
    }
    setStoredApiUrl(value);
    setApiUrl(value);
    setApiSaved("Server address saved. Sign out and sign in again if login fails.");
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api<Array<{ id: string; key: string; value: string }>>(
        "/settings",
      );
      const rows = (Array.isArray(data) ? data : []).map((s) => {
        const meta = describeKey(s.key);
        return {
          id: s.id,
          key: s.key,
          value: s.value,
          label: meta.label,
          help: meta.help,
          group: meta.group,
        };
      });
      setSettings(rows);
      const next: Record<string, string> = {};
      for (const row of rows) next[row.key] = row.value;
      setDrafts(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const editableGroups = useMemo(() => {
    const wanted = new Set(["Company", "Inventory rules", "Document numbers"]);
    const groups = new Map<string, SettingRow[]>();
    for (const row of settings) {
      if (!wanted.has(row.group)) continue;
      const list = groups.get(row.group) ?? [];
      list.push(row);
      groups.set(row.group, list);
    }
    return Array.from(groups.entries());
  }, [settings]);

  const advancedRows = useMemo(
    () => settings.filter((s) => s.group === "Inventory status codes" || s.group === "Other"),
    [settings],
  );

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = editableGroups.flatMap(([, rows]) =>
        rows.map((row) => ({
          key: row.key,
          value: drafts[row.key] ?? row.value,
        })),
      );
      await api("/settings/bulk", {
        method: "PUT",
        body: { settings: payload },
      });
      setSuccess("Settings saved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save settings");
    } finally {
      setSubmitting(false);
    }
  }

  const advancedColumns: Column<SettingRow>[] = [
    { key: "key", header: "Key", mono: true },
    { key: "label", header: "Meaning" },
    { key: "value", header: "Value", mono: true },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Basic company and inventory rules — change the plain fields below. Advanced codes are optional."
      />

      <SectionIntro
        eyebrow="System setup"
        title="What belongs in Settings?"
        body="Settings are defaults for the whole company: name, currency, which stock is sellable, and how document numbers start. Day-to-day stock work stays on Inventory / Production / Orders."
        items={[
          "Company — name, city, currency, timezone",
          "Inventory rules — what counts as Available",
          "Document numbers — prefixes like PO-, SO-, PRD-",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}
      {apiSaved && <div className="alert alert--success">{apiSaved}</div>}

      <form className="form-panel" onSubmit={saveApiUrl} style={{ marginBottom: 16 }}>
        <h3 className="form-panel__title">Mobile / API server</h3>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0 }}>
          The app UI runs on your phone. Stock data still comes from the FA Apparels API
          on your computer (same Wi‑Fi). Example:{" "}
          <code>{DEFAULT_MOBILE_API_URL}</code>
        </p>
        <div className="form-field">
          <label htmlFor="apiUrl">API server URL</label>
          <input
            id="apiUrl"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder={DEFAULT_MOBILE_API_URL}
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Save server address
        </button>
      </form>

      <form onSubmit={handleSave}>
        {editableGroups.map(([group, rows]) => (
          <section key={group} className="form-panel">
            <h3 className="form-panel__title">{group}</h3>
            <div className="form-grid">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="form-field"
                  style={{
                    gridColumn:
                      row.key === "inventory.available_statuses" ||
                      row.key === "inventory.low_stock_note"
                        ? "1 / -1"
                        : undefined,
                  }}
                >
                  <label htmlFor={row.key}>{row.label}</label>
                  <input
                    id={row.key}
                    value={drafts[row.key] ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [row.key]: e.target.value }))
                    }
                    disabled={loading}
                  />
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {row.help}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div style={{ marginBottom: 20 }}>
          <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
            {submitting ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      <section className="form-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <h3 className="form-panel__title" style={{ marginBottom: 4 }}>
              Advanced status codes
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
              These are technical inventory status names. You usually do not need to edit them.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Hide" : "Show"} advanced
          </button>
        </div>
        {showAdvanced && (
          <div style={{ marginTop: 14 }}>
            <DataTable
              columns={advancedColumns}
              data={advancedRows}
              loading={loading}
              emptyMessage="No advanced settings."
              searchPlaceholder="Search key…"
              searchKeys={["key", "label", "value"]}
              getRowKey={(row) => row.id}
              footer={`${advancedRows.length} keys`}
            />
          </div>
        )}
      </section>
    </>
  );
}
