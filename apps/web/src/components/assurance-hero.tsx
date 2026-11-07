"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, CheckCircle, Cloud, Fingerprint,
  Lightning, LockKey, ShieldCheck, Warning,
} from "@phosphor-icons/react";

const proofOutcomes = ["verified evidence", "governed fixes", "cryptographic proof"];

const heroSteps = [
  {
    step: "01",
    name: "Interpret",
    badge: "GOOGLE ADK · GEMINI 3.5 FLASH",
    title: "Is customer storage inaccessible from the unauthenticated public internet?",
    status: "FAILED",
    statusText: "Finding Identified",
    resource: "gs://trustfix-customer-storage-prod",
    resourceSub: "Principal allUsers assigned roles/storage.objectViewer",
    risk: "HIGH EXPOSURE",
    flow: [
      { num: "1", label: "REQUIREMENT", text: "Customer storage public isolation?" },
      { num: "2", label: "DETERMINISTIC CONTROL", text: "GCP_STORAGE_PUBLIC_ACCESS" },
      { num: "3", label: "MATCH ACCURACY", text: "100% deterministic binding" },
    ],
    decision: "Mapped questionnaire requirement to deterministic Google Cloud control ID without hallucinated criteria.",
    statusBadge: "Mapped",
  },
  {
    step: "02",
    name: "Inspect",
    badge: "KEYLESS SCANNER IDENTITY",
    title: "Collect IAM policy and Uniform Bucket-Level Access directly from Cloud Storage API",
    status: "FAILED",
    statusText: "Public Principal Present",
    resource: "gs://trustfix-customer-storage-prod",
    resourceSub: "Public Access Prevention: inherited | IAM allUsers active",
    risk: "UNAUTHENTICATED ACCESS",
    flow: [
      { num: "1", label: "API PROBE", text: "Live storage.buckets.getIamPolicy" },
      { num: "2", label: "BINDING FOUND", text: "allUsers → roles/storage.objectViewer" },
      { num: "3", label: "EVIDENCE DIGEST", text: "SHA-256: 7f83b165...0126" },
    ],
    decision: "Dedicated keyless service account collected fresh infrastructure policy directly from Google Cloud.",
    statusBadge: "Inspected",
  },
  {
    step: "03",
    name: "Evaluate",
    badge: "CODE-BACKED POLICY ENGINE",
    title: "Deterministic evaluation: Resource fails non-public storage compliance criteria",
    status: "FAILED",
    statusText: "Control Evaluation: Failed",
    resource: "gs://trustfix-customer-storage-prod",
    resourceSub: "Violates: No anonymous principals permitted in bucket IAM",
    risk: "GAP DETECTED",
    flow: [
      { num: "1", label: "POLICY CRITERIA", text: "allUsers == 0 && PAP == enforced" },
      { num: "2", label: "EVALUATION RESULT", text: "FAILED (1 finding flagged)" },
      { num: "3", label: "AUTOMATION GATE", text: "Surgical remediation plan drafted" },
    ],
    decision: "Deterministic Python policy evaluator checked evidence. Zero LLM hallucinations in the security decision.",
    statusBadge: "Evaluated",
  },
  {
    step: "04",
    name: "Approve",
    badge: "SEPARATED MUTATION AUTHORITY",
    title: "Surgical minimum delta: Remove 1 IAM binding with captured pre-change rollback",
    status: "PENDING",
    statusText: "Awaiting Operator Approval",
    resource: "gs://trustfix-customer-storage-prod",
    resourceSub: "Delta: -allUsers | Pre-change rollback snapshot captured",
    risk: "HUMAN GOVERNANCE GATE",
    flow: [
      { num: "1", label: "MUTATION DELTA", text: "Remove 1 public IAM binding only" },
      { num: "2", label: "DRIFT FINGERPRINT", text: "Pre-change SHA-256 locked" },
      { num: "3", label: "AUTHORITY GATE", text: "Owner or Security Reviewer required" },
    ],
    decision: "Mutation is locked to verified project boundary. Safe rollback snapshot stored in Firestore.",
    statusBadge: "Awaiting Gate",
  },
  {
    step: "05",
    name: "Verify",
    badge: "INDEPENDENT HTTP PROBE",
    title: "Anonymous HTTP GET returns 403 Forbidden. Control VERIFIED with cryptographic proof.",
    status: "VERIFIED",
    statusText: "Verified & Proven",
    resource: "gs://trustfix-customer-storage-prod",
    resourceSub: "External anonymous probe: HTTP 403 Forbidden confirmed",
    risk: "100% PROVEN SAFE",
    flow: [
      { num: "1", label: "MUTATED IAM", text: "Public principal surgically purged" },
      { num: "2", label: "EXTERNAL PROBE", text: "GET storage.googleapis.com → 403" },
      { num: "3", label: "PROOF PACK", text: "Tamper-evident JSON sealed" },
    ],
    decision: "Independent external probe mathematically proved public access is denied before sealing the Proof Pack.",
    statusBadge: "Proven",
  },
];

export function AssuranceHero() {
  const [outcomeIndex, setOutcomeIndex] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const outcomeTimer = window.setInterval(
      () => setOutcomeIndex((current) => (current + 1) % proofOutcomes.length),
      2600
    );
    return () => window.clearInterval(outcomeTimer);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setTimeout(() => {
      setActiveStep((prev) => (prev + 1) % heroSteps.length);
    }, 3800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeStep, isPaused]);

  const current = heroSteps[activeStep];
  const isVerified = current.status === "VERIFIED";

  return (
    <section className="hero-v3">
      <div className="hero-v3-glow" />
      <div className="hero-v3-grid" />
      
      <div className="hero-v3-copy">
        <div className="hero-v3-badge">
          <span className="pulse-dot-wrapper">
            <span className="pulse-dot-core" />
            <span className="pulse-dot-ping" />
          </span>
          <span className="badge-tech">Google Cloud & Agent Development Kit</span>
          <span className="badge-divider" />
          <span className="badge-label">Continuous Assurance</span>
        </div>

        <h1>
          <span>Turn cloud risk into</span>
          <span className="hero-v3-outcome" aria-hidden="true">
            <em key={proofOutcomes[outcomeIndex]}>{proofOutcomes[outcomeIndex]}</em>
          </span>
        </h1>
        
        <p>
          TrustFix continuously audits Google Cloud environments, proves compliance against security questionnaires with live cryptographic evidence, and executes human-governed remediations.
        </p>
        
        <div className="hero-actions">
          <a className="button primary" href="/app">
            Launch workspace <ArrowRight size={14} />
          </a>
          <Link className="button secondary" href="/controls">
            Explore 9 supported controls
          </Link>
        </div>

        <div className="hero-v3-trust">
          <span><CheckCircle weight="fill" /> Keyless cloud inspection</span>
          <span><ShieldCheck weight="fill" /> Governed human approval</span>
          <span><Fingerprint weight="fill" /> Independent HTTP probes</span>
        </div>
      </div>

      <div
        className="proof-window"
        aria-label="TrustFix live assurance simulation console"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <header className="proof-window-header">
          <div className="window-dots"><i /><i /><i /></div>
          <strong className="terminal-title">
            trustfix-assurance-engine <span className="terminal-sub">· project-boundary: verified</span>
          </strong>
          <div className="engine-status-pill">
            <span className="status-ping" />
            LIVE SIMULATION
          </div>
        </header>

        <div className="proof-window-body">
          <aside className="proof-rail">
            {heroSteps.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => { setActiveStep(idx); setIsPaused(true); }}
                className={`rail-btn ${idx === activeStep ? "rail-active" : ""}`}
              >
                <span className="rail-step">{s.step}</span>
                <span className="rail-name">{s.name}</span>
              </button>
            ))}
          </aside>

          <main className="proof-content">
            <div className="proof-question-row">
              <div className="question-info">
                <span className="micro-badge">{current.badge}</span>
                <h2 className="question-text">{current.title}</h2>
              </div>
              <span className={`status ${isVerified ? "verified" : current.status === "FAILED" ? "failed" : "needs-review"}`}>
                {isVerified ? <CheckCircle weight="fill" /> : <Warning weight="fill" />} {current.statusText}
              </span>
            </div>

            <div className="proof-resource-row">
              <span className="resource-icon">
                {isVerified ? <LockKey size={18} /> : <Cloud size={18} />}
              </span>
              <div className="resource-details">
                <strong className="resource-name">{current.resource}</strong>
                <small className="resource-sub">{current.resourceSub}</small>
              </div>
              <span className="risk-tag">{current.risk}</span>
            </div>

            <div className="proof-flow-grid">
              {current.flow.map((f, i) => (
                <div key={f.num} className={`flow-card ${isVerified && i === 2 ? "flow-success" : ""}`}>
                  <span className="flow-num">{f.num}</span>
                  <div className="flow-text-wrap">
                    <small>{f.label}</small>
                    <strong>{f.text}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="proof-decision-row">
              <span className="decision-icon"><Lightning weight="fill" /></span>
              <div className="decision-text-wrap">
                <small>DETERMINISTIC ASSURANCE DECISION</small>
                <strong>{current.decision}</strong>
              </div>
              <span className="decision-badge">{current.statusBadge}</span>
            </div>
          </main>
        </div>

        <footer className="proof-window-footer">
          <span><i /> Keyless scanner identity</span>
          <span>Pre-change drift locked</span>
          <span>Google ADK · Gemini 3.5 Flash</span>
        </footer>
      </div>
    </section>
  );
}
