"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, List } from "@phosphor-icons/react";
import { Sidebar } from "@/components/sidebar";
import { Mark } from "@/components/brand";
import { ErrorBoundary } from "@/components/error-boundary";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Redirect old-style hostnames
    const host = window.location.hostname;
    if (host.startsWith("trustfix-app-") || host.startsWith("trustfix-web-")) {
      window.location.replace(
        window.location.href.replace(
          /^https:\/\/trustfix-(?:app|web)-/,
          "https://trustfix-workspace-",
        ),
      );
      return;
    }

    // Allow onboarding page without auth check
    if (pathname === "/app/onboarding") {
      setReady(true);
      return;
    }

    fetch("/api/trustfix/api/onboarding", { cache: "no-store" })
      .then((r) => {
        if (r.status === 401) {
          // Not authenticated at all — let the IAP handle it
          router.replace("/app/onboarding");
          return null;
        }
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return; // Already redirecting or failed silently
        if (!data.onboarding_complete) {
          router.replace("/app/onboarding");
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        // Network error — still show the app rather than looping
        setReady(true);
      });
  }, [pathname, router]);

  if (pathname === "/app/onboarding") return <>{children}</>;

  if (!ready) {
    return (
      <main className="onboarding">
        <div className="onboarding-card">
          <Mark />
          <p>Preparing your authenticated workspace…</p>
        </div>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar open={open} close={() => setOpen(false)} />
      <div className="app-main">
        <header className="mobile-header">
          <button onClick={() => setOpen(true)} aria-label="Open navigation">
            <List size={22} />
          </button>
          <Mark />
          <button aria-label="Notifications">
            <Bell size={20} />
          </button>
        </header>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    </div>
  );
}
