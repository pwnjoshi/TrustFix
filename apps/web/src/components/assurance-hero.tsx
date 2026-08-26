"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, Cloud, Fingerprint, Lightning, ShieldCheck, Warning } from "@phosphor-icons/react";

export function AssuranceHero() {
  return <section className="hero-v3">
    <div className="hero-v3-glow"/><div className="hero-v3-grid"/>
    <div className="hero-v3-copy">
      <div className="hero-v3-badge"><span/> Autonomous cloud assurance <small>BUILT WITH GOOGLE ADK</small></div>
      <h1>Security answers are easy.<br/><em>Proof changes everything.</em></h1>
      <p>TrustFix inspects real Google Cloud infrastructure, governs the smallest safe fix, and independently verifies the result—turning every security claim into defensible evidence.</p>
      <div className="hero-actions"><Link className="button primary luminous" href="/demo">Explore the interactive demo <ArrowRight/></Link><a className="button dark-outline" href="/app">Open real workspace</a></div>
      <div className="hero-v3-trust"><span><CheckCircle weight="fill"/> Live infrastructure</span><span><ShieldCheck weight="fill"/> Approval governed</span><span><Fingerprint weight="fill"/> Audit ready</span></div>
    </div>

    <div className="proof-window" aria-label="TrustFix evidence-backed remediation preview">
      <header><div className="window-dots"><i/><i/><i/></div><strong>TRUSTFIX · ASSURANCE RUN</strong><span><i/> LIVE</span></header>
      <div className="proof-window-body">
        <aside><span className="rail-active"><i>01</i>Interpret</span><span><i>02</i>Inspect</span><span><i>03</i>Evaluate</span><span><i>04</i>Approve</span><span><i>05</i>Verify</span></aside>
        <main>
          <div className="proof-question"><div><span className="micro">SECURITY REQUIREMENT</span><h2>Is customer storage inaccessible from the public internet?</h2></div><span className="status failed"><Warning/> Finding</span></div>
          <div className="proof-resource"><span className="proof-resource-icon"><Cloud/></span><div><strong>gs://trustfix-public-storage-demo</strong><small>allUsers → roles/storage.objectViewer</small></div><span>MEDIUM RISK</span></div>
          <div className="proof-flow"><div><span className="flow-number">1</span><p><small>OBSERVED</small><strong>Public principal detected</strong></p></div><ArrowRight/><div><span className="flow-number">2</span><p><small>MINIMUM CHANGE</small><strong>Remove one IAM binding</strong></p></div><ArrowRight/><div className="flow-success"><CheckCircle weight="fill"/><p><small>PROVED</small><strong>Anonymous HTTP 403</strong></p></div></div>
          <div className="proof-decision"><span><Lightning weight="fill"/></span><div><small>TRUSTFIX AGENT DECISION</small><strong>Approval-ready remediation with captured rollback</strong></div><span className="proof-awaiting">Awaiting reviewer</span></div>
        </main>
      </div>
      <footer><span><i/> Evidence collected</span><span>Drift fingerprint locked</span><span>Gemini 3.5 Flash · Google ADK</span></footer>
    </div>
  </section>;
}
