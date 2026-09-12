"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setToken, getToken } from "@/lib/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("farooqpatel259");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/");
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();

      if (!response.ok || payload.error) {
        const msg =
          payload.message ||
          payload.error?.message ||
          (Array.isArray(payload.message) ? payload.message.join(", ") : null) ||
          "Invalid credentials";
        throw new Error(typeof msg === "string" ? msg : "Invalid credentials");
      }

      const token =
        payload.data?.accessToken ??
        payload.data?.token ??
        payload.accessToken ??
        payload.token;

      if (!token) throw new Error("No access token returned from server");

      setToken(token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <img
          src="/fa-apparels-logo.png"
          alt="FA Apparels"
          className="login-hero__logo"
        />
        <h1>FA APPARELS</h1>
        <p>
          Apparel inventory, purchasing, production, sorting, and warehouse
          operations — with a full audit ledger.
        </p>
        <div className="login-hero__meta">
          <span>Balances + ledger</span>
          <span>RBAC</span>
          <span>CSV import / export</span>
        </div>
      </section>

      <section className="login-side">
        <div className="login-panel">
          <div className="login-panel__brand">
            <img
              src="/fa-apparels-logo.png"
              alt="FA Apparels"
              className="login-panel__logo"
            />
            <h1>Sign in</h1>
            <p>Access FA Apparels operations</p>
          </div>

          {error && <div className="form-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label htmlFor="email">Login ID</label>
              <input
                id="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-field" style={{ marginBottom: 20 }}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="login-hint">
            Admin: farooqpatel259 / farooqpatel2006
          </div>
        </div>
      </section>
    </div>
  );
}
