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
    if (!user) return "Security Lead";
    const name = user.display_name?.trim();
    if (!name || name.toLowerCase() === "owner") return "Security Lead";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [user]);

  const subtext = useMemo(() => {
    if (user === undefined) return "Checking session…";
    if (!user) return "Session verified";
    return user.email || `${user.role} Account`;
  }, [user]);

  const initials = useMemo(() => {
    if (user === undefined) return "…";
    if (!user) return "SL";
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

        <div className="sidebar-footer-container">
          {/* Workspace Card */}
          <Link href="/app/system" className="sidebar-workspace-chip">
            <span className="sidebar-avatar-small">T</span>
            <div className="sidebar-chip-info">
              <strong className="sidebar-chip-title">TrustFix Workspace</strong>
              <small className="sidebar-chip-sub">Firestore-backed</small>
            </div>
            <ThemeToggle compact />
          </Link>

          {/* User Account Card */}
          <div
            className="sidebar-user-chip"
            onClick={() => setSettingsOpen(true)}
            title="Account settings & preferences"
          >
            <span className="sidebar-avatar-user">
              {initials}
            </span>
            <div className="sidebar-chip-info">
              <strong className="sidebar-chip-title">
                {customName || displayName}
              </strong>
              <small className="sidebar-chip-sub">
                {subtext}
              </small>
            </div>
            <a
              href="/_gcp_iap/clear_login_cookie"
              className="sidebar-signout-link"
              onClick={(e) => e.stopPropagation()}
            >
              Sign out
            </a>
          </div>
        </div>
      </aside>

      {/* Account Settings Modal */}
      {settingsOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}
        >
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Account Settings</h3>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <label className="modal-field">
                <span>Display Name</span>
                <input
                  type="text"
                  value={customName || (displayName === "Security Lead" ? "Security Lead" : displayName)}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter your name"
                />
              </label>

              <div className="modal-field">
                <span>Workspace Role</span>
                <div className="modal-readonly-val">
                  {user?.role || "Owner"} (Administrative Privilege)
                </div>
              </div>

              <div className="modal-field">
                <span>Authenticated Identity</span>
                <div className="modal-readonly-val mono">
                  {user?.email || "owner@trustfix.local"}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <a href="/_gcp_iap/clear_login_cookie" className="button secondary danger">
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

export { List };
