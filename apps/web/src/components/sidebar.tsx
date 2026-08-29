"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

  const displayName = useMemo(() => {
    if (user === undefined) return "Loading…";
    if (!user) return "Signed-in User";
    const name = user.display_name?.trim();
    if (!name || name.toLowerCase() === "owner") return "Security Lead";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [user]);

  const subtext = useMemo(() => {
    if (user === undefined) return "Checking session…";
    if (!user) return "Session unavailable";
    return user.email || `${user.role} Account`;
  }, [user]);

  const initials = useMemo(() => {
    if (user === undefined) return "…";
    if (!user) return "?";
    if (displayName === "Security Lead") return "SL";
    return displayName.slice(0, 2).toUpperCase();
  }, [user, displayName]);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [customName, setCustomName] = useState("");

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
          <Link href="/app/system" className="workspace-card" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", textDecoration: "none" }}>
            <span className="avatar small" style={{ width: "24px", height: "24px", borderRadius: "6px", background: "rgba(37,99,235,0.2)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px" }}>T</span>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: "12px", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>TrustFix Workspace</strong>
              <small style={{ fontSize: "11px", color: "#94a3b8" }}>Firestore-backed</small>
            </div>
            <ThemeToggle compact />
          </Link>

          {/* User Account Card */}
          <div
            className="user-card"
            onClick={() => setSettingsOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", cursor: "pointer", transition: "border-color 0.2s ease" }}
            title="Click to view account settings"
          >
            <span className="avatar" style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1e293b", color: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "12px", border: "1px solid rgba(255,255,255,0.15)" }}>
              {initials}
            </span>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <strong style={{ fontSize: "12px", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {customName || displayName}
              </strong>
              <small style={{ fontSize: "10px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {subtext}
              </small>
            </div>
            <a
              href="/_gcp_iap/clear_login_cookie"
              className="sign-out"
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: "11px", fontWeight: 600, color: "#60a5fa", textDecoration: "none", padding: "4px 6px", borderRadius: "4px", background: "rgba(37,99,235,0.1)" }}
            >
              Sign out
            </a>
          </div>
        </div>
      </aside>

      {/* Account Settings Modal */}
      {settingsOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(6, 9, 14, 0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
        >
          <div style={{ width: "100%", maxWidth: "440px", background: "var(--tf-surface)", border: "1px solid var(--tf-line-strong)", borderRadius: "16px", padding: "28px", boxShadow: "var(--tf-shadow-modal)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", margin: 0, fontWeight: 700, color: "var(--tf-ink)" }}>Account Settings</h3>
              <button type="button" onClick={() => setSettingsOpen(false)} style={{ background: "transparent", border: 0, color: "var(--tf-ink-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--tf-ink)" }}>
                Display Name
                <input
                  type="text"
                  value={customName || (displayName === "Security Lead" ? "Security Lead" : displayName)}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter your name"
                  style={{ padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--tf-line-strong)", background: "var(--tf-surface-sunken)", color: "var(--tf-ink)", fontSize: "13px" }}
                />
              </label>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
                <span style={{ fontWeight: 600, color: "var(--tf-ink)" }}>Workspace Role</span>
                <span style={{ fontSize: "12px", color: "var(--tf-ink-muted)", background: "var(--tf-surface-sunken)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--tf-line)" }}>
                  {user?.role || "Owner"} (Full Administrative Privilege)
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
                <span style={{ fontWeight: 600, color: "var(--tf-ink)" }}>Authenticated Email</span>
                <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--tf-ink-muted)", background: "var(--tf-surface-sunken)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--tf-line)" }}>
                  {user?.email || "owner@trustfix.local"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--tf-line)" }}>
              <a href="/_gcp_iap/clear_login_cookie" className="button secondary" style={{ fontSize: "12px", color: "#ef4444" }}>
                Sign out of session
              </a>
              <button type="button" className="button primary" onClick={() => setSettingsOpen(false)}>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Re-export for use in app layout
export { List };
