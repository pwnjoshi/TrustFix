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

const telemetryBadges = [
  {
    tag: "LIVE AGENT ENGINE",
    detail: "Gemini 3.5 Flash · Google ADK",
    sub: "Zero Hallucinations",
    href: "/security",
    color: "#10b981",
  },
  {
    tag: "KEYLESS GCP SCANNER",
    detail: "Direct Google Cloud IAM APIs",
    sub: "Zero Static Credentials",
    href: "/controls",
    color: "#38bdf8",
  },
  {
    tag: "DETERMINISTIC VERIFIER",
    detail: "External HTTP 403 Probes",
    sub: "100% Code-Proved",
    href: "/demo",
    color: "#818cf8",
  },
  {
    tag: "AUDIT PROOF PACK",
    detail: "SHA-256 Cryptographic Ledger",
    sub: "Tamper-Evident Artifacts",
    href: "/product",
    color: "#fbbf24",
  },
];

export function AssuranceHero() {
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const [telemetryIndex, setTelemetryIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const windowRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const outcomeTimer = window.setInterval(
      () => setOutcomeIndex((current) => (current + 1) % proofOutcomes.length),
      2800
    );
    const telemetryTimer = window.setInterval(
      () => setTelemetryIndex((current) => (current + 1) % telemetryBadges.length),
      3400
    );
    return () => {
      window.clearInterval(outcomeTimer);
      window.clearInterval(telemetryTimer);
    };
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

  // Parallax zoom effect on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const progress = Math.min(scrollY / 500, 1);
      setScrollProgress(progress);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const current = heroSteps[activeStep];
  const activeTelemetry = telemetryBadges[telemetryIndex];
  const isVerified = current.status === "VERIFIED";

  // Interpolate smooth 3D scale and tilt based on scroll
  const scale = 0.95 + scrollProgress * 0.05;
  const translateY = (1 - scrollProgress) * 20;
  const rotateX = (1 - scrollProgress) * 3.5;
  const glowOpacity = 0.6 + scrollProgress * 0.4;

  return (
    <section className="hero-v3">
      <div className="hero-v3-glow" style={{ opacity: glowOpacity }} />
      <div className="hero-v3-grid" />
      <div className="hero-v3-copy">
        <Link
          href={activeTelemetry.href}
          className="hero-v3-badge interactive-telemetry-badge"
          title="Click to explore this capability & architecture"
        >
          <span style={{ background: activeTelemetry.color, boxShadow: `0 0 10px ${activeTelemetry.color}` }} />
          <strong>{activeTelemetry.tag}</strong>
          <small>{activeTelemetry.detail}</small>
          <span className="badge-tag-extra">{activeTelemetry.sub}</span>
          <ArrowRight size={11} className="badge-arrow" />
        </Link>
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
          <Link className="button primary luminous" href="/demo">
            Explore interactive demo <ArrowRight />
          </Link>
          <a className="button dark-outline" href="/app">
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
        ref={windowRef}
        className="proof-window parallax-zoom-window"
        aria-label="TrustFix live assurance simulation console"
        style={{
          transform: `perspective(1200px) scale(${scale}) translateY(${translateY}px) rotateX(${rotateX}deg)`,
          transformOrigin: "center top",
          transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease",
        }}
      >
        <header>
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

        <div className="proof-window-body" style={{ minHeight: "410px" }}>
          <aside style={{ width: "160px", flexShrink: 0 }}>
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
                  border: 0,
                  textAlign: "left",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <i>{s.step}</i> {s.name}
              </button>
            ))}
          </aside>

          <main style={{ flex: 1, minWidth: 0 }}>
            <div className="proof-question" style={{ minHeight: "56px", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="micro">{current.badge}</span>
                <h2 style={{ fontSize: "15px", lineHeight: "1.3", margin: "4px 0 0" }}>{current.title}</h2>
              </div>
              <span
                className={`status ${isVerified ? "verified" : current.status === "FAILED" ? "failed" : "needs-review"}`}
                style={{ flexShrink: 0, marginLeft: "12px" }}
              >
                {isVerified ? <CheckCircle weight="fill" /> : <Warning weight="fill" />} {current.statusText}
              </span>
            </div>

            <div className="proof-resource" style={{ minHeight: "52px", alignItems: "center" }}>
              <span className="proof-resource-icon">
                {isVerified ? <LockKey size={20} /> : <Cloud size={20} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {current.resource}
                </strong>
                <small style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {current.resourceSub}
                </small>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", marginLeft: "12px", flexShrink: 0 }}>
                {current.risk}
              </span>
            </div>

            <div className="proof-flow" style={{ minHeight: "72px" }}>
              {current.flow.map((f, i) => (
                <div key={f.num} className={isVerified && i === 2 ? "flow-success" : ""} style={{ flex: 1, minWidth: 0 }}>
                  <span className="flow-number">{f.num}</span>
                  <p>
                    <small>{f.label}</small>
                    <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {f.text}
                    </strong>
                  </p>
                </div>
              ))}
            </div>

            <div className="proof-decision" style={{ minHeight: "52px", alignItems: "center" }}>
              <span style={{ flexShrink: 0 }}><Lightning weight="fill" /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <small>TRUSTFIX OPERATIONAL ASSURANCE DECISION</small>
                <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {current.decision}
                </strong>
              </div>
              <span className="proof-awaiting" style={{ flexShrink: 0, marginLeft: "12px" }}>
                {current.statusBadge}
              </span>
            </div>
          </main>
        </div>

        <footer>
          <span><i /> Keyless scanner IAM</span>
          <span>Drift fingerprint locked</span>
          <span>Gemini 3.5 Flash · Google ADK</span>
        </footer>
      </div>
    </section>
  );
}
