"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { CsvActions } from "@/components/CsvActions";
import { downloadCsv, readCsvFile } from "@/lib/csv";

interface SupplierRow {
  id: string;
  code: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data } = await api<
        Array<{
          id: string;
          code: string;
          name: string;
          contactName?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          isActive: boolean;
        }>
      >("/suppliers");
      setSuppliers(
        (Array.isArray(data) ? data : []).map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          contactName: s.contactName ?? "—",
          email: s.email ?? "—",
          phone: s.phone ?? "—",
          address: s.address ?? "—",
          isActive: s.isActive,
        })),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await api("/suppliers", {
        method: "POST",
        body: { code, name, contactName, email, phone, address },
      });
      setCode("");
      setName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setAddress("");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  function exportSuppliers() {
    downloadCsv(
      "suppliers.csv",
      suppliers.map((s) => ({
        code: s.code,
        name: s.name,
        contact_name: s.contactName,
        email: s.email,
        phone: s.phone,
        address: s.address,
        status: s.isActive ? "ACTIVE" : "INACTIVE",
      })),
    );
  }

  async function importSuppliers(file: File) {
    const rows = await readCsvFile(file);
    let created = 0;
    for (const row of rows) {
      const c = row.code || row.Code;
      const n = row.name || row.Name;
      if (!c || !n) continue;
      await api("/suppliers", {
        method: "POST",
        body: {
          code: c,
          name: n,
          contactName: row.contact_name || row.contactName,
          email: row.email,
          phone: row.phone,
          address: row.address,
        },
      });
      created += 1;
    }
    await load();
    if (created === 0) throw new Error("No valid rows (need code + name)");
  }

  const columns: Column<SupplierRow>[] = [
    { key: "code", header: "Code", mono: true },
    { key: "name", header: "Supplier" },
    { key: "contactName", header: "Contact" },
    { key: "email", header: "Email" },
    { key: "phone", header: "Phone", mono: true },
    { key: "address", header: "Address" },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Vendor master used by purchase orders, receiving, and lead-time planning."
        actions={
          <CsvActions
            onExport={exportSuppliers}
            onImport={importSuppliers}
            templateHint="Import columns: code, name, contact_name, email, phone, address"
            disabled={loading}
          />
        }
      />

      <SectionIntro
        eyebrow="Purchasing"
        title="Who you buy from"
        body="Keep contact, address, and commercial details with each supplier. Purchase orders always reference a supplier record."
      />

      {error && <div className="alert alert--error">{error}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">Suppliers</div>
          <div className="detail-chip__value">{suppliers.length}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Active</div>
          <div className="detail-chip__value">
            {suppliers.filter((s) => s.isActive).length}
          </div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">Add supplier</h3>
        {formError && <div className="form-error">{formError}</div>}
        <form className="form-grid" onSubmit={handleCreate}>
          <div className="form-field">
            <label htmlFor="code">Code</label>
            <input id="code" required value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="name">Name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="contactName">Contact</label>
            <input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="address">Address</label>
            <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="form-field form-field--actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Create supplier"}
            </button>
          </div>
        </form>
      </section>

      <DataTable
        columns={columns}
        data={suppliers}
        loading={loading}
        emptyMessage="No suppliers yet."
        searchPlaceholder="Search suppliers…"
        searchKeys={["code", "name", "email", "phone", "contactName"]}
        getRowKey={(row) => row.id}
        footer={`${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"}`}
      />
    </>
  );
}
