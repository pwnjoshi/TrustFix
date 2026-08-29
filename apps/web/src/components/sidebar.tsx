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
        <div className="workspace-card">
          <span className="avatar small">T</span>
          <div>
            <strong>TrustFix workspace</strong>
            <small>Firestore-backed</small>
          </div>
        </div>
        <ThemeToggle />
        <div className="user-card">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <div>
            <strong>
              {user === undefined ? "Loading…" : user?.display_name ?? "Signed-in user"}
            </strong>
            <small>
              {user === undefined
                ? "Checking session…"
                : user
                ? `${user.role} · ${user.email}`
                : "Session unavailable"}
            </small>
          </div>
          <a href="/_gcp_iap/clear_login_cookie" className="sign-out" style={{ fontSize: 10, color: "var(--muted)", marginLeft: "auto" }}>
            Sign out
          </a>
        </div>
      </aside>
    </>
  );
}

// Re-export for use in app layout
export { List };
