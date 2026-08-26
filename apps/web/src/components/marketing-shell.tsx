"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, List, X } from "@phosphor-icons/react";
import { Mark } from "./brand";

export function MarketingHeader() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
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

  // Shared, lightweight motion treatment for every public marketing route.
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const sections = document.querySelectorAll<HTMLElement>(
      ".home-choice,.statement-section,.comparison-v2,.workflow-v2,.capability-stage,.architecture-v2>header,.architecture-rail,.final-cta-v2,.inner-hero,.demo-hero,.detail-grid,.product-workflow,.security-principles,.boundary-table,.demo-console,.split-cta",
    );
    const items = document.querySelectorAll<HTMLElement>(
      ".experience-choice article,.capability-cards article,.architecture-rail div,.detail-grid article,.security-principles article,.demo-steps li",
    );
    sections.forEach((element) => element.classList.add("motion-reveal"));
    items.forEach((element, index) => {
      element.classList.add("motion-item");
      element.style.setProperty("--motion-order", String(index % 6));
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });
    sections.forEach((element) => observer.observe(element));
    items.forEach((element) => observer.observe(element));

    let frame = 0;
    const updateParallax = () => {
      frame = 0;
      const distance = Math.min(window.scrollY, 1400);
      document.documentElement.style.setProperty("--marketing-parallax", `${distance * 0.075}px`);
      document.documentElement.style.setProperty("--marketing-parallax-soft", `${distance * 0.035}px`);
      document.documentElement.style.setProperty("--marketing-proof", `${distance * -0.006}px`);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateParallax);
    };
    updateParallax();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      document.documentElement.style.removeProperty("--marketing-parallax");
      document.documentElement.style.removeProperty("--marketing-parallax-soft");
      document.documentElement.style.removeProperty("--marketing-proof");
    };
  }, []);

  const close = () => setDrawerOpen(false);

  return (
    <>
      <nav className="marketing-nav">
        <Link href="/" aria-label="TrustFix home">
          <Mark />
        </Link>
        <div className="nav-links">
          <Link href="/product">Product</Link>
          <Link href="/#controls">Controls</Link>
          <Link href="/security">Security</Link>
          <Link href="/demo">Public demo</Link>
          <a className="button secondary" href="/app">Sign in</a>
          <a className="button primary" href="/app">
            Open workspace <ArrowRight size={14} />
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
          <Link href="/product" onClick={close}>Product</Link>
          <Link href="/#controls" onClick={close}>Controls</Link>
          <Link href="/security" onClick={close}>Security</Link>
          <Link href="/demo" onClick={close}>Public demo</Link>
          <a href="/app" style={{ borderBottom: "none", paddingTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="button secondary wide" style={{ display: "flex" }}>Sign in</span>
            <span className="button primary wide" style={{ display: "flex" }}>
              Open workspace <ArrowRight size={14} />
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
        <a href="/app">Sign in</a>
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
