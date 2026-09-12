"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";

interface RoleOption {
  id: string;
  code: string;
  name: string;
  _count?: { userRoles: number };
}

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  roleName: string;
  roleCode: string;
  roleId: string;
  isActive: boolean;
  plainJob: string;
}

const ROLE_PLAIN: Record<string, string> = {
  SUPER_ADMIN: "Full access — can do everything",
  INVENTORY_MANAGER: "Stock, articles, warehouses, reports",
  WAREHOUSE_MANAGER: "Warehouse stock, receiving, dispatch",
  WAREHOUSE_WORKER: "View stock + receive / dispatch only",
  PRODUCTION_MANAGER: "Production jobs and related stock views",
  SORTING_MANAGER: "Sorting queue management",
  QC_MANAGER: "Quality checks",
  PURCHASING_MANAGER: "Suppliers, purchase orders, receiving",
  SALES_MANAGER: "Customer orders and dispatch",
  VIEWER: "Read-only — look, do not change",
};

function plainJob(roleCode: string): string {
  return ROLE_PLAIN[roleCode] ?? "Custom role";
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Admin123!");
  const [roleId, setRoleId] = useState("");

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api<
          Array<{
            id: string;
            email: string;
            fullName: string;
            isActive: boolean;
            userRoles?: Array<{
              role: { id: string; code: string; name: string };
            }>;
          }>
        >("/users"),
        api<RoleOption[]>("/users/roles"),
      ]);

      const roleList = Array.isArray(rolesRes.data) ? rolesRes.data : [];
      setRoles(roleList);

      setUsers(
        (Array.isArray(usersRes.data) ? usersRes.data : []).map((u) => {
          const role = u.userRoles?.[0]?.role;
          const code = role?.code ?? "";
          return {
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            roleName: role?.name ?? "No role",
            roleCode: code,
            roleId: role?.id ?? "",
            isActive: u.isActive,
            plainJob: plainJob(code),
          };
        }),
      );

      if (!roleId && roleList[0]) {
        const preferred =
          roleList.find((r) => r.code === "VIEWER") ?? roleList[0];
        setRoleId(preferred.id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      roleFilter === "ALL"
        ? users
        : users.filter((u) => u.roleCode === roleFilter),
    [users, roleFilter],
  );

  const totals = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const inactive = users.length - active;
    return { total: users.length, active, inactive, roles: roles.length };
  }, [users, roles]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    if (!fullName.trim() || !email.trim() || !password || !roleId) {
      setFormError("Fill name, email, password, and role.");
      return;
    }

    setSubmitting(true);
    try {
      await api("/users", {
        method: "POST",
        body: {
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          roleId,
        },
      });
      setSuccess(`User ${email.trim()} created. They can sign in with that password.`);
      setFullName("");
      setEmail("");
      setPassword("Admin123!");
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not create user");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: UserRow) {
    setFormError(null);
    setSuccess(null);
    try {
      await api(`/users/${user.id}`, {
        method: "PATCH",
        body: { isActive: !user.isActive },
      });
      setSuccess(
        user.isActive
          ? `${user.fullName} is now inactive (cannot sign in).`
          : `${user.fullName} is active again.`,
      );
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  async function changeRole(user: UserRow, nextRoleId: string) {
    if (!nextRoleId || nextRoleId === user.roleId) return;
    setFormError(null);
    setSuccess(null);
    try {
      await api(`/users/${user.id}`, {
        method: "PATCH",
        body: { roleId: nextRoleId },
      });
      const role = roles.find((r) => r.id === nextRoleId);
      setSuccess(`${user.fullName} role set to ${role?.name ?? "updated"}.`);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Role update failed");
    }
  }

  const columns: Column<UserRow>[] = [
    { key: "fullName", header: "Name" },
    { key: "email", header: "Login email", mono: true },
    { key: "roleName", header: "Role" },
    { key: "plainJob", header: "What they can do" },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <select
            aria-label={`Role for ${row.fullName}`}
            value={row.roleId}
            onChange={(e) => changeRole(row, e.target.value)}
            style={{ maxWidth: 160, padding: "4px 6px", fontSize: 12 }}
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: "4px 8px", fontSize: 12 }}
            onClick={() => toggleActive(row)}
          >
            {row.isActive ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="People who can sign in — each person gets a role that controls what they are allowed to do."
      />

      <SectionIntro
        eyebrow="Team access"
        title="How users work"
        body="A user is a login. A role is their job type (what screens they can use). Pick a simple role when you add someone — you can change it later."
        items={[
          "Create — name, email, password, role",
          "Change role — update their job type from the table",
          "Deactivate — stop login without deleting the account",
        ]}
      />

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div className="detail-grid">
        <div className="detail-chip">
          <div className="detail-chip__label">People</div>
          <div className="detail-chip__value">{totals.total}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Active</div>
          <div className="detail-chip__value">{totals.active}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Inactive</div>
          <div className="detail-chip__value">{totals.inactive}</div>
        </div>
        <div className="detail-chip">
          <div className="detail-chip__label">Roles</div>
          <div className="detail-chip__value">{totals.roles}</div>
        </div>
      </div>

      <section className="form-panel">
        <h3 className="form-panel__title">Roles in plain English</h3>
        <div className="report-picker">
          {roles.map((role) => (
            <div key={role.id} className="report-picker__item" style={{ cursor: "default" }}>
              <strong>{role.name}</strong>
              <span>{plainJob(role.code)}</span>
              <em>{role._count?.userRoles ?? 0} user(s)</em>
            </div>
          ))}
        </div>
      </section>

      <section className="form-panel">
        <h3 className="form-panel__title">1. Add a person</h3>
        {formError && <div className="form-error">{formError}</div>}
        <form className="form-grid" onSubmit={handleCreate}>
          <div className="form-field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Example: Sara Ali"
            />
          </div>
          <div className="form-field">
            <label htmlFor="email">Login email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sara@company.com"
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Temporary password</label>
            <input
              id="password"
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="roleId">Job role</label>
            <select
              id="roleId"
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={loading || roles.length === 0}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {plainJob(r.code)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field form-field--actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn btn-primary" disabled={submitting || loading}>
              {submitting ? "Saving…" : "Create user"}
            </button>
          </div>
        </form>
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
          Demo admin: <code>farooqpatel259</code> / <code>farooqpatel2006</code>. Other demo
          roles use password <code>Admin123!</code> (inventory, warehouse, purchasing, sales,
          viewer @inventory.local).
        </p>
      </section>

      <div className="form-panel" style={{ paddingBottom: 14 }}>
        <div className="form-field" style={{ maxWidth: 280 }}>
          <label htmlFor="roleFilter">2. Filter people by role</label>
          <select
            id="roleFilter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="No users yet. Create one above."
        searchPlaceholder="Search name, email, role…"
        searchKeys={["fullName", "email", "roleName", "plainJob"]}
        getRowKey={(row) => row.id}
        footer={`${filtered.length} user${filtered.length === 1 ? "" : "s"} shown`}
      />
    </>
  );
}
