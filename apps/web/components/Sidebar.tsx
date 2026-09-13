"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clearToken } from "@/lib/auth";
import { api } from "@/lib/api";

interface NavItem {
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/" },
  {
    label: "Inventory",
    children: [
      { label: "Balances", href: "/inventory" },
      { label: "Movements", href: "/inventory/movements" },
      { label: "Adjustments", href: "/inventory/adjustments" },
    ],
  },
  { label: "Articles", href: "/articles" },
  {
    label: "Purchasing",
    children: [
      { label: "Suppliers", href: "/purchasing/suppliers" },
      { label: "Purchase Orders", href: "/purchasing/orders" },
      { label: "Receiving", href: "/purchasing/receiving" },
    ],
  },
  { label: "Warehouse", href: "/warehouses" },
  { label: "Production", href: "/production" },
  { label: "Sorting", href: "/sorting" },
  { label: "Orders", href: "/orders" },
  { label: "Reports", href: "/reports" },
  { label: "Users", href: "/users" },
  { label: "Settings", href: "/settings" },
  { label: "Audit", href: "/audit" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      className={`sidebar__link${active ? " sidebar__link--active" : ""}`}
    >
      {label}
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const [userName, setUserName] = useState("Operator");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    api<{ user?: { fullName?: string; email?: string } }>("/auth/me")
      .then(({ data }) => {
        if (data?.user?.fullName) setUserName(data.user.fullName);
        if (data?.user?.email) setUserEmail(data.user.email);
      })
      .catch(() => undefined);
  }, []);

  function handleLogout() {
    clearToken();
    window.location.href = "/login";
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img
          src="/fa-apparels-logo.png"
          alt="FA Apparels"
          className="sidebar__brand-logo"
        />
        <div>
          <h2 className="sidebar__brand-title">FA APPARELS</h2>
          <p className="sidebar__brand-sub">Apparel operations</p>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation" onClick={onNavigate}>
        {NAV_ITEMS.map((item) => (
          <div key={item.label} className="sidebar__section">
            {item.children ? (
              <>
                <div className="sidebar__link sidebar__link--parent">{item.label}</div>
                {item.children.map((child) => (
                  <NavLink key={child.href} href={child.href} label={child.label} />
                ))}
              </>
            ) : (
              item.href && <NavLink href={item.href} label={item.label} />
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <strong>{userName}</strong>
          {userEmail || "Signed in"}
        </div>
        <button type="button" className="btn btn-ghost" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
