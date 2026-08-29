"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Article, CirclesThreePlus, Gauge, Gear, List,
  ListChecks, Pulse, Scroll, ShieldWarning, SquaresFour,
  UsersThree, X,
} from "@phosphor-icons/react";
import { Mark } from "./brand";
import { ThemeToggle } from "./theme-toggle";

const primary = [
  ["Overview", "/app", Gauge],
  ["Reviews", "/app/reviews", Article],
  ["Controls", "/app/controls", ListChecks],
  ["Findings", "/app/findings", ShieldWarning],
  ["Evidence", "/app/evidence", SquaresFour],
  ["Activity", "/app/activity", Pulse],
] as const;

const workspace = [
  ["Integrations", "/app/integrations", CirclesThreePlus],
  ["Policies", "/app/policies", Scroll],
  ["Team", "/app/team", UsersThree],
  ["System", "/app/system", Gear],
] as const;

type User = { display_name: string; email: string; role: string } | null;

export function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const path = usePathname();
  const [user, setUser] = useState<User>(undefined as unknown as User);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trustfix/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setUser(data); })
      .catch(() => { if (!cancelled) setUser(null); });
    return () => { cancelled = true; };
  }, []);

  function isActive(href: string) {
    if (href === "/app") return path === "/app";
    return path.startsWith(href);
  }

  const group = (items: typeof primary | typeof workspace) =>
    items.map(([label, href, Icon]) => (
      <Link
        key={href}
        href={href}
        onClick={close}
        className={isActive(href) ? "active" : ""}
        aria-current={isActive(href) ? "page" : undefined}
      >
        <Icon size={18} />
        <span>{label}</span>
      </Link>
    ));

  const initials =
    user === undefined
      ? "…"
      : user
      ? user.display_name.slice(0, 2).toUpperCase()
      : "?";

  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={close} aria-hidden="true" />
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Application navigation">
        <div className="side-brand">
          <Mark />
          <button aria-label="Close navigation" onClick={close}>
            <X size={20} />
          </button>
        </div>
        <nav>
          {group(primary)}
          <span className="nav-label">Workspace</span>
          {group(workspace)}
        </nav>
        <div className="sidebar-footer-container" style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Workspace Card */}
          <div className="workspace-card" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }}>
            <span className="avatar small" style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(37,99,235,0.2)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px" }}>T</span>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: "12px", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>TrustFix Workspace</strong>
              <small style={{ fontSize: "11px", color: "#94a3b8" }}>Firestore-backed</small>
            </div>
            <ThemeToggle compact />
          </div>

          {/* User Account Card */}
          <div className="user-card" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }}>
            <span className="avatar" style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1e293b", color: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", border: "1px solid rgba(255,255,255,0.15)" }}>
              {initials}
            </span>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: "12px", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user === undefined ? "Loading…" : user?.display_name ?? "Signed-in user"}
              </strong>
              <small style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user === undefined
                  ? "Checking session…"
                  : user
                  ? `${user.role} · ${user.email}`
                  : "Session unavailable"}
              </small>
            </div>
            <a href="/_gcp_iap/clear_login_cookie" className="sign-out" style={{ fontSize: "11px", fontWeight: 600, color: "#60a5fa", textDecoration: "none", padding: "4px 6px", borderRadius: "4px", background: "rgba(37,99,235,0.1)" }}>
              Sign out
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

// Re-export for use in app layout
export { List };
