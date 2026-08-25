"use client";
import { useState } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, List } from "@phosphor-icons/react";
import { Sidebar } from "@/components/sidebar";
import { Mark } from "@/components/brand";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const host = window.location.hostname;
    if (host.startsWith("trustfix-app-") || host.startsWith("trustfix-web-")) {
      window.location.replace(window.location.href.replace(/^https:\/\/trustfix-(?:app|web)-/, "https://trustfix-workspace-"));
      return;
    }
    if (pathname === "/app/onboarding") { setReady(true); return; }
    fetch("/api/trustfix/api/onboarding", { cache: "no-store" }).then(response => response.ok ? response.json() : null).then(data => {
      if (!data?.onboarding_complete) router.replace("/app/onboarding");
      else setReady(true);
    }).catch(() => router.replace("/app/onboarding"));
  }, [pathname, router]);
  if (pathname === "/app/onboarding") return children;
  if (!ready) return <main className="onboarding"><div className="onboarding-card"><Mark/><p>Preparing your authenticated workspace…</p></div></main>;
  return <div className="app-shell"><Sidebar open={open} close={() => setOpen(false)}/><div className="app-main"><header className="mobile-header"><button onClick={() => setOpen(true)} aria-label="Open navigation"><List size={22}/></button><Mark/><button aria-label="Notifications"><Bell size={20}/></button></header>{children}</div></div>;
}
