"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getToken } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [children]);

  if (!ready) {
    return (
      <div className="page-loading">
        <span className="spinner" />
        Verifying session…
      </div>
    );
  }

  return (
    <div className={`app-shell${menuOpen ? " app-shell--menu-open" : ""}`}>
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-topbar__menu"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
        <div className="mobile-topbar__title">FA APPARELS</div>
      </header>

      {menuOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <Sidebar onNavigate={() => setMenuOpen(false)} />
      <div className="app-main">
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
