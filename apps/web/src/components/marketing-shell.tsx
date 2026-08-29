"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, List, X } from "@phosphor-icons/react";
import { Mark } from "./brand";
import { ThemeToggle } from "./theme-toggle";

export function MarketingHeader() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [insideWorkspace, setInsideWorkspace] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    setInsideWorkspace(window.location.hostname.startsWith("trustfix-workspace-"));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Trap focus and lock scroll when open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const close = () => setDrawerOpen(false);

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav className="marketing-nav">
        <Link href="/" aria-label="TrustFix home">
          <Mark />
        </Link>
        <div className="nav-links">
          <Link
            href="/product"
            className={isLinkActive("/product") ? "active" : ""}
            aria-current={isLinkActive("/product") ? "page" : undefined}
          >
            Product
          </Link>
          <Link href="/#controls">Controls</Link>
          <Link
            href="/security"
            className={isLinkActive("/security") ? "active" : ""}
            aria-current={isLinkActive("/security") ? "page" : undefined}
          >
            Security
          </Link>
          <Link
            href="/demo"
            className={isLinkActive("/demo") ? "active" : ""}
            aria-current={isLinkActive("/demo") ? "page" : undefined}
          >
            Public demo
          </Link>
          <ThemeToggle compact />
          <a className="button primary" href="/app">
            {insideWorkspace ? "Open workspace" : "Start for free"} <ArrowRight size={14} />
          </a>
        </div>
        <button
          className="marketing-hamburger"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <List size={22} />
        </button>
      </nav>

      {/* Mobile drawer backdrop */}
      <div
        className={`marketing-drawer-backdrop ${drawerOpen ? "open" : ""}`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <nav
        ref={drawerRef}
        className={`marketing-drawer ${drawerOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!drawerOpen}
      >
        <button className="marketing-drawer-close" onClick={close} aria-label="Close navigation">
          <X size={20} />
        </button>
        <div style={{ marginTop: 48 }}>
          <Link
            href="/product"
            onClick={close}
            className={isLinkActive("/product") ? "active" : ""}
            aria-current={isLinkActive("/product") ? "page" : undefined}
          >
            Product
          </Link>
          <Link href="/#controls" onClick={close}>Controls</Link>
          <Link
            href="/security"
            onClick={close}
            className={isLinkActive("/security") ? "active" : ""}
            aria-current={isLinkActive("/security") ? "page" : undefined}
          >
            Security
          </Link>
          <Link
            href="/demo"
            onClick={close}
            className={isLinkActive("/demo") ? "active" : ""}
            aria-current={isLinkActive("/demo") ? "page" : undefined}
          >
            Public demo
          </Link>
          <div style={{ padding: "12px 0", borderBottom: "1px solid var(--tf-line)" }}>
            <ThemeToggle />
          </div>
          <a href="/app" style={{ borderBottom: "none", paddingTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="button primary wide" style={{ display: "flex" }}>
              {insideWorkspace ? "Open workspace" : "Start for free"} <ArrowRight size={14} />
            </span>
          </a>
        </div>
      </nav>
    </>
  );
}

export function MarketingFooter() {
  return (
    <footer>
      <Mark />
      <div className="footer-links">
        <Link href="/product">Product</Link>
        <Link href="/demo">Demo</Link>
        <Link href="/security">Security</Link>
        <a href="/app">Start for free</a>
      </div>
      <span>© 2026 TrustFix</span>
    </footer>
  );
}

export function PublicNotice() {
  return (
    <div className="public-notice">
      <strong>Public illustrative experience</strong>
      <span>No cloud account or login required. Demo data is clearly labeled and never presented as live evidence.</span>
    </div>
  );
}
