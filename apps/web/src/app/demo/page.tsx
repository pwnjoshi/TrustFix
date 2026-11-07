"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, CheckCircle, CloudCheck, LockKey,
  Play, ArrowCounterClockwise, Warning, ShieldCheck,
  Fingerprint, Lightning,
} from "@phosphor-icons/react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const steps = [
  {
    title: "Interpret & Translate",
    detail: "Question mapped to GCP_STORAGE_PUBLIC_ACCESS",
    description:
      "Gemini 3.5 Flash and Google ADK parse the natural-language security requirement and bind it to a deterministic Google Cloud control ID. Ambiguous phrasing is resolved; unsupported questions are flagged rather than guessed.",
    agent: "TrustFix Orchestrator → resolve_control('Customer storage public access') → GCP_STORAGE_PUBLIC_ACCESS (confidence 1.0)",
  },
  {
    title: "Keyless Inspection",
    detail: "Bucket IAM contains allUsers → roles/storage.objectViewer",
    description:
      "The scanner queries the target project using its dedicated keyless service account identity to inspect Cloud Storage bucket IAM and Public Access Prevention. No static credentials or passwords are exchanged.",
    agent: "Cloud Storage IAM API → gs://trustfix-customer-storage-prod → allUsers: roles/storage.objectViewer",
  },
  {
    title: "Deterministic Evaluation",
    detail: "Control failed against live evidence properties",
    description:
      "Deterministic code compares the collected evidence against compliance criteria. The result is FAILED — public principals are present in bucket IAM. Zero LLM hallucinations are involved in the security verdict.",
    agent: "EVALUATION: FAILED (1 public principal detected). Evidence ID: ev-prod-storage-01. Sealed: just now.",
  },
  {
    title: "Governed Remediation Plan",
    detail: "Remove public binding and enforce Public Access Prevention",
    description:
      "TrustFix calculates the minimal safe mutation: remove only allUsers/allAuthenticatedUsers IAM bindings while preserving authorized team roles. The exact delta, drift fingerprint, risk level, and rollback snapshot are recorded.",
    agent: "Plan: Remove allUsers from roles/storage.objectViewer. Risk: HIGH. Pre-change rollback snapshot captured.",
  },
  {
    title: "Human Approval Gate",
    detail: "Workspace operator reviews and authorizes the execution",
    description:
      "The remediation halts at an explicit governance gate requiring approval from an authorized Security Reviewer or Owner. The approval is persisted with a cryptographic idempotency key.",
    agent: "Approval record created. Operator: security-lead@company.com. Idempotency key locked.",
  },
  {
    title: "Independent External Probe",
    detail: "Anonymous HTTP GET returns 403 Forbidden",
    description:
      "After the mutation is applied, an independent external HTTP probe confirms that unauthenticated requests to the bucket are rejected. Only after this probe passes is the control marked VERIFIED and the Proof Pack sealed.",
    agent: "External Probe → GET https://storage.googleapis.com/trustfix-customer-storage-prod → HTTP 403 Forbidden. Control: VERIFIED.",
  },
] as const;

export default function PublicDemo() {
  const [stage, setStage] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isVerified = stage >= 5;

  function advance() {
    setStage((s) => Math.min(s + 1, steps.length - 1));
  }

  function reset() {
    setStage(0);
    setAutoPlay(false);
  }

  useEffect(() => {
    if (!autoPlay) return;
    if (stage >= steps.length - 1) { setAutoPlay(false); return; }
    timerRef.current = setTimeout(advance, 2200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoPlay, stage]);

  const current = steps[stage];

  return (
    <main className="marketing-page">
      <MarketingHeader />

      <section className="demo-hero">
        <span className="section-index">INTERACTIVE ASSURANCE SIMULATOR</span>
        <h1>Experience the TrustFix loop before connecting your cloud.</h1>
        <p>
          Step through how TrustFix translates natural-language requirements, gathers keyless cloud evidence, evaluates deterministic controls, governs safe remediations, and verifies proof.
        </p>
      </section>

      <section className="demo-console">
        {/* Console header */}
        <div className="demo-console-head">
          <div>
            <span className="micro">SECURITY ASSURANCE SIMULATION</span>
            <h2>Is sensitive customer storage inaccessible from the unauthenticated public internet?</h2>
          </div>
          <span className={`status ${isVerified ? "verified" : stage >= 2 ? "failed" : "needs-review"}`}>
            {isVerified ? "Verified with Proof" : stage >= 2 ? "Failure Detected" : "Inspecting…"}
          </span>
        </div>

        {/* Controls */}
        <div className="demo-controls">
          <button
            type="button"
            className="button secondary"
            onClick={reset}
            aria-label="Reset simulator"
          >
            <ArrowCounterClockwise size={16} /> Reset
          </button>
          <button
            type="button"
            className={`button ${autoPlay ? "secondary" : "primary"}`}
            onClick={() => setAutoPlay((p) => !p)}
            aria-label={autoPlay ? "Pause playback" : "Auto-advance simulator"}
          >
            <Play size={16} weight={autoPlay ? "regular" : "fill"} />
            {autoPlay ? "Pause" : "Auto-advance"}
          </button>
          <button
            type="button"
            className="button primary"
            onClick={advance}
            disabled={stage >= steps.length - 1}
            aria-label="Advance to next step"
          >
            Next step <ArrowRight size={14} />
          </button>
        </div>

        {/* Stepper rail */}
        <div className="demo-stepper-rail">
          {steps.map((s, idx) => (
            <button
              key={s.title}
              type="button"
              onClick={() => { setStage(idx); setAutoPlay(false); }}
              className={`demo-step-tab ${idx === stage ? "active" : idx < stage ? "complete" : ""}`}
            >
              <span className="step-badge">{String(idx + 1).padStart(2, "0")}</span>
              <span className="step-name">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Active Stage Body */}
        <div className="demo-stage-body">
          <div className="stage-info-header">
            <div>
              <span className="stage-counter">STEP {stage + 1} OF {steps.length}</span>
              <h3>{current.title}</h3>
              <p className="stage-detail">{current.detail}</p>
            </div>
            <span className={`status ${isVerified ? "verified" : stage >= 2 ? "failed" : "neutral"}`}>
              {isVerified ? "Control Verified" : stage >= 4 ? "Approval Gate" : stage >= 2 ? "Gap Identified" : "Analyzing"}
            </span>
          </div>

          <p className="stage-desc">{current.description}</p>

          <div className="agent-terminal">
            <div className="terminal-header">
              <span className="terminal-dot" />
              <span>TRUSTFIX CONTROL PLANE LOG</span>
            </div>
            <code>{current.agent}</code>
          </div>
        </div>

        {/* Footer */}
        <footer className="demo-console-footer">
          <span><CloudCheck size={16} /> Keyless Workload Identity</span>
          <span><ShieldCheck size={16} /> Governed human approvals</span>
          <span><Fingerprint size={16} /> Independent HTTP 403 proof</span>
        </footer>
      </section>

      {/* CTA */}
      <section className="final-cta final-cta-v2">
        <span className="section-index">LIVE AUDITING</span>
        <h2>Ready to run real assurance on your project?</h2>
        <p>Connect your Google Cloud project boundary to start continuous verification.</p>
        <div className="hero-actions">
          <a className="button primary" href="/app">
            Launch live workspace <ArrowRight size={14} />
          </a>
          <Link className="button secondary" href="/controls">
            Explore 9 controls catalog
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
