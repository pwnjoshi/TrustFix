"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, Brain, CheckCircle, Cloud, Fingerprint, Lightning, ShieldCheck, Warning } from "@phosphor-icons/react";

export function AssuranceHero() {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = section.current;
    if (!node || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const move = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--pointer-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
      node.style.setProperty("--pointer-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      node.style.setProperty("--tilt-x", `${((event.clientY - rect.top) / rect.height - .5) * -5}deg`);
      node.style.setProperty("--tilt-y", `${((event.clientX - rect.left) / rect.width - .5) * 7}deg`);
    };
    node.addEventListener("pointermove", move);
    return () => node.removeEventListener("pointermove", move);
  }, []);
  return <section className="hero-v2" ref={section}>
    <div className="hero-aurora one"/><div className="hero-aurora two"/><div className="hero-grid-lines"/>
    <div className="hero-copy-v2"><div className="hero-badge"><span/><strong>Autonomous cloud assurance</strong><small>Gemini 3.5 + Google ADK</small></div><h1>Cloud security answers<br/><em>that prove themselves.</em></h1><p>TrustFix turns security requirements into live Google Cloud checks, governs the smallest safe fix, and independently verifies the result—while you work on something else.</p><div className="hero-actions"><Link className="button primary luminous" href="/demo">Experience the live story <ArrowRight/></Link><a className="button dark-outline" href="/app">Open protected workspace</a></div><div className="hero-proof-row"><span><CheckCircle weight="fill"/> Real infrastructure</span><span><ShieldCheck weight="fill"/> Human-governed changes</span><span><Fingerprint weight="fill"/> Audit-ready proof</span></div></div>
    <div className="hero-system"><div className="system-chrome"><span/><span/><span/><strong>TRUSTFIX / MISSION CONTROL</strong><small>LIVE</small></div><div className="system-canvas"><div className="system-status"><div><span className="micro">CUSTOMER REQUIREMENT</span><strong>Is sensitive storage inaccessible from the public internet?</strong></div><span className="status failed"><Warning/> Failed</span></div><div className="topology"><div className="topology-node source"><Cloud/><span>Google Cloud</span><small>trustfix-demo-target</small></div><svg viewBox="0 0 600 160" preserveAspectRatio="none"><path d="M72 85 C180 20 235 150 330 78 S470 40 535 82"/><path className="flow-path" d="M72 85 C180 20 235 150 330 78 S470 40 535 82"/></svg><div className="topology-node risk-node"><Warning/><span>Public bucket</span><small>allUsers → objectViewer</small></div><div className="agent-brain"><Brain weight="duotone"/></div></div><div className="agent-decision"><div className="decision-icon"><Lightning weight="fill"/></div><div><span className="micro">AGENT DECISION</span><strong>Minimum-change remediation ready</strong><small>Remove 1 public principal · rollback captured · approval required</small></div><span className="decision-time">1.8s</span></div><div className="system-verification"><CheckCircle weight="fill"/><div><span className="micro">INDEPENDENT VERIFICATION</span><strong>Anonymous request denied</strong></div><code>HTTP 403</code></div></div><div className="system-footer"><span><i/>Evidence collected</span><span>Drift fingerprint locked</span><span>Proof Pack ready</span></div></div>
  </section>;
}
