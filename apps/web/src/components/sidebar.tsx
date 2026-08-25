"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Article, CirclesThreePlus, Gauge, Gear, ListChecks, Pulse, Scroll, ShieldWarning, SquaresFour, UsersThree, X } from "@phosphor-icons/react";
import { Mark } from "./brand";

const primary = [["Overview", "/app", Gauge], ["Reviews", "/app/reviews", Article], ["Controls", "/app/controls", ListChecks], ["Findings", "/app/findings", ShieldWarning], ["Evidence", "/app/evidence", SquaresFour], ["Activity", "/app/activity", Pulse]] as const;
const workspace = [["Integrations", "/app/integrations", CirclesThreePlus], ["Policies", "/app/policies", Scroll], ["Team", "/app/team", UsersThree], ["Settings", "/app/system", Gear]] as const;

export function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const path = usePathname();
  const [user, setUser] = useState<{ display_name: string; email: string; role: string } | null>(null);
  useEffect(() => { fetch("/api/trustfix/api/auth/me", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then(setUser).catch(() => setUser(null)); }, []);
  const group = (items: typeof primary | typeof workspace) => items.map(([label, href, Icon]) => <Link onClick={close} key={href} href={href} className={path === href ? "active" : ""}><Icon size={18}/><span>{label}</span></Link>);
  return <><div className={`scrim ${open ? "show" : ""}`} onClick={close}/><aside className={`sidebar ${open ? "open" : ""}`}><div className="side-brand"><Mark/><button aria-label="Close navigation" onClick={close}><X size={20}/></button></div><nav>{group(primary)}<span className="nav-label">Workspace</span>{group(workspace)}</nav><div className="workspace-card"><span className="avatar small">T</span><div><strong>TrustFix workspace</strong><small>Firestore-backed</small></div></div><div className="user-card"><span className="avatar">{user?.display_name?.slice(0, 2).toUpperCase() || "…"}</span><div><strong>{user?.display_name || "Signed-in user"}</strong><small>{user ? `${user.role} · ${user.email}` : "Checking session…"}</small></div><a href="/_gcp_iap/clear_login_cookie" className="sign-out">Sign out</a></div></aside></>;
}
