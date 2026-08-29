"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, CheckCircle, Cloud, Fingerprint,
  Lightning, LockKey, Play, ShieldCheck, Warning,
} from "@phosphor-icons/react";

const proofOutcomes = ["verified evidence", "governed fixes", "audit-ready proof"];

const heroSteps = [
  {
    step: "01",
    name: "Interpret",
    badge: "GEMINI 3.5 FLASH · ADK",
    title: "Is customer storage inaccessible from the public internet?",
    status: "FAILED",
    statusText: "Finding Detected",
    resource: "gs://trustfix-public-storage-demo",
    resourceSub: "allUsers → roles/storage.objectViewer",
    risk: "MEDIUM RISK",
    flow: [
      { num: "1", label: "QUESTION", text: "Storage public access?" },
      { num: "2", label: "MAPPED CONTROL", text: "GCP_STORAGE_PUBLIC_ACCESS" },
      { num: "3", label: "CONFIDENCE", text: "94% deterministic match" },
    ],
    decision: "Mapped questionnaire requirement to deterministic Google Cloud control ID.",
    statusBadge: "Interpreted",
  },
  {
    step: "02",
    name: "Inspect",
    badge: "KEYLESS SCANNER IDENTITY",
    title: "Read IAM policies across live Google Cloud Storage buckets",
    status: "FAILED",
    statusText: "Public Access Found",
    resource: "gs://trustfix-public-storage-demo",
    resourceSub: "allUsers granted Storage Object Viewer",
    risk: "MEDIUM RISK",
    flow: [
      { num: "1", label: "OBSERVED", text: "Public principal detected" },
      { num: "2", label: "BINDING", text: "roles/storage.objectViewer" },
      { num: "3", label: "EVIDENCE", text: "ID: ev-demo-storage-01" },
    ],
    decision: "Keyless scanner identity collected current bucket IAM policy directly from GCP API.",
    statusBadge: "Inspected",
  },
  {
    step: "03",
    name: "Evaluate",
    badge: "DETERMINISTIC POLICY ENGINE",
    title: "Policy evaluation: Bucket violates non-public storage requirement",
    status: "FAILED",
    statusText: "Control Failed",
    resource: "gs://trustfix-public-storage-demo",
    resourceSub: "Failed: unauthenticated public read enabled",
    risk: "MEDIUM RISK",
    flow: [
      { num: "1", label: "CRITERIA", text: "No allUsers in IAM" },
      { num: "2", label: "RESULT", text: "FAILED (1 finding)" },
      { num: "3", label: "ACTION", text: "Remediation plan generated" },
    ],
    decision: "Deterministic code evaluated evidence. Zero LLM hallucinations involved in the decision.",
    statusBadge: "Evaluated",
  },
  {
    step: "04",
    name: "Approve",
    badge: "SEPARATED MUTATION AUTHORITY",
    title: "Surgical minimum delta: Remove 1 IAM binding with captured rollback",
    status: "PENDING",
    statusText: "Awaiting Approval",
    resource: "gs://trustfix-public-storage-demo",
    resourceSub: "Delta: -allUsers | Rollback: captured",
    risk: "GOVERNED MUTATION",
    flow: [
      { num: "1", label: "DELTA", text: "Remove 1 IAM binding" },
      { num: "2", label: "FINGERPRINT", text: "SHA-256 drift locked" },
      { num: "3", label: "GATE", text: "Owner approval required" },
    ],
    decision: "Remediation is locked to the verified project. Idempotent approval queued.",
    statusBadge: "Approved",
  },
  {
    step: "05",
    name: "Verify",
    badge: "INDEPENDENT HTTP PROBE",
    title: "Anonymous probe returns HTTP 403 Forbidden. Control VERIFIED.",
    status: "VERIFIED",
    statusText: "Verified with Proof",
    resource: "gs://trustfix-public-storage-demo",
    resourceSub: "Anonymous probe: HTTP 403 Forbidden",
    risk: "SECURED & PROVEN",
    flow: [
      { num: "1", label: "MUTATED", text: "Public principal removed" },
      { num: "2", label: "PROBED", text: "Anonymous GET → 403" },
      { num: "3", label: "PROOF PACK", text: "Cryptographic manifest ready" },
    ],
    decision: "Independent probe proved public access is denied. Audit-ready Proof Pack packaged.",
    statusBadge: "Proven",
  },
];

export function AssuranceHero() {
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const outcomeTimer = window.setInterval(
      () => setOutcomeIndex((current) => (current + 1) % proofOutcomes.length),
      2800
    );
    return () => window.clearInterval(outcomeTimer);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    timerRef.current = setTimeout(() => {
      setActiveStep((prev) => (prev + 1) % heroSteps.length);
    }, 3400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, activeStep]);

  const current = heroSteps[activeStep];
  const isVerified = current.status === "VERIFIED";

  return (
    <section className="hero-v3">
      <div className="hero-v3-glow" />
      <div className="hero-v3-grid" />
      <div className="hero-v3-copy">
        <h1 aria-label="Turn cloud risk into verified evidence.">
          <span>Turn cloud risk into</span>
          <span className="hero-v3-outcome" aria-hidden="true">
            <em key={proofOutcomes[outcomeIndex]}>{proofOutcomes[outcomeIndex]}</em>
          </span>
        </h1>
        <p>
          TrustFix inspects live Google Cloud, governs the smallest safe fix, and independently verifies the result with audit-ready proof.
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/demo">
            Explore interactive demo <ArrowRight size={14} />
          </Link>
          <a className="button secondary" href="/app">
            Start for free
          </a>
        </div>
        <div className="hero-v3-trust">
          <span><CheckCircle weight="fill" /> Live cloud inspection</span>
          <span><ShieldCheck weight="fill" /> Governed mutations</span>
          <span><Fingerprint weight="fill" /> Audit-ready proof</span>
        </div>
      </div>

      <div
        className="proof-window"
        aria-label="TrustFix live assurance simulation console"
        style={{
          width: "100%",
          maxWidth: "1040px",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <header style={{ height: "42px", minHeight: "42px", maxHeight: "42px", boxSizing: "border-box" }}>
          <div className="window-dots"><i /><i /><i /></div>
          <strong>TRUSTFIX · AUTONOMOUS ASSURANCE ENGINE</strong>
          <button
            type="button"
            className="sim-play-toggle"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause simulation" : "Play simulation"}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: 0,
              color: isPlaying ? "var(--green)" : "var(--muted)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            <Play size={12} weight={isPlaying ? "fill" : "regular"} />
            {isPlaying ? "SIMULATING LIVE" : "PAUSED"}
          </button>
        </header>

        <div
          className="proof-window-body"
          style={{
            display: "grid",
            gridTemplateColumns: "160px minmax(0, 1fr)",
            width: "100%",
            height: "410px",
            minHeight: "410px",
            maxHeight: "410px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          <aside style={{ width: "160px", minWidth: "160px", maxWidth: "160px", flexShrink: 0, boxSizing: "border-box", overflowY: "auto" }}>
            {heroSteps.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  setActiveStep(idx);
                  setIsPlaying(false);
                }}
                className={idx === activeStep ? "rail-active" : ""}
                style={{
                  border: "1px solid transparent",
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <i>{s.step}</i> {s.name}
              </button>
            ))}
          </aside>

          <main
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
              width: "100%",
              minWidth: 0,
              padding: "20px 24px",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <div className="proof-question" style={{ height: "60px", minHeight: "60px", maxHeight: "60px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
                <span className="micro">{current.badge}</span>
                <h2 style={{ fontSize: "15px", lineHeight: "1.35", margin: "4px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {current.title}
                </h2>
              </div>
              <span
                className={`status ${isVerified ? "verified" : current.status === "FAILED" ? "failed" : "needs-review"}`}
                style={{ flexShrink: 0, whiteSpace: "nowrap" }}
              >
                {isVerified ? <CheckCircle weight="fill" /> : <Warning weight="fill" />} {current.statusText}
              </span>
            </div>

            <div className="proof-resource" style={{ height: "52px", minHeight: "52px", maxHeight: "52px", display: "flex", alignItems: "center", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
              <span className="proof-resource-icon" style={{ flexShrink: 0 }}>
                {isVerified ? <LockKey size={20} /> : <Cloud size={20} />}
              </span>
              <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
                <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {current.resource}
                </strong>
                <small style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {current.resourceSub}
                </small>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", flexShrink: 0, whiteSpace: "nowrap" }}>
                {current.risk}
              </span>
            </div>

            <div className="proof-flow" style={{ height: "76px", minHeight: "76px", maxHeight: "76px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
              {current.flow.map((f, i) => (
                <div key={f.num} className={isVerified && i === 2 ? "flow-success" : ""} style={{ minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}>
                  <span className="flow-number">{f.num}</span>
                  <p style={{ minWidth: 0, overflow: "hidden" }}>
                    <small>{f.label}</small>
                    <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {f.text}
                    </strong>
                  </p>
                </div>
              ))}
            </div>

            <div className="proof-decision" style={{ height: "54px", minHeight: "54px", maxHeight: "54px", display: "flex", alignItems: "center", width: "100%", minWidth: 0, boxSizing: "border-box" }}>
              <span style={{ flexShrink: 0 }}><Lightning weight="fill" /></span>
              <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
                <small>TRUSTFIX OPERATIONAL ASSURANCE DECISION</small>
                <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {current.decision}
                </strong>
              </div>
              <span className="proof-awaiting" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                {current.statusBadge}
              </span>
            </div>
          </main>
        </div>

        <footer style={{ height: "38px", minHeight: "38px", maxHeight: "38px", boxSizing: "border-box" }}>
          <span><i /> Keyless scanner IAM</span>
          <span>Drift fingerprint locked</span>
          <span>Gemini 3.5 Flash · Google ADK</span>
        </footer>
      </div>
    </section>
  );
}
