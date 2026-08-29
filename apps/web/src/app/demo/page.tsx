"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, CheckCircle, CloudCheck, LockKey,
  Play, ArrowCounterClockwise, Warning,
} from "@phosphor-icons/react";
import { MarketingFooter, MarketingHeader, PublicNotice } from "@/components/marketing-shell";

const steps = [
  {
    title: "Interpret",
    detail: "Question mapped to GCP_STORAGE_PUBLIC_ACCESS",
    description:
      "Gemini reads the natural-language security requirement and maps it to a deterministic Google Cloud control. Ambiguous phrasing is resolved; unsupported questions are flagged rather than guessed.",
    agent: "TrustFix orchestrator → supported_controls() → GCP_STORAGE_PUBLIC_ACCESS (confidence 0.94)",
  },
  {
    title: "Inspect",
    detail: "Bucket IAM contains allUsers → objectViewer",
    description:
      "The scanner connects to the disposable target project using its dedicated identity and reads Storage bucket IAM policies. No secrets are stored — the Cloud Run service account provides credentials.",
    agent: "Cloud Storage IAM API → gs://trustfix-public-storage-demo → allUsers: roles/storage.objectViewer",
  },
  {
    title: "Evaluate",
    detail: "Control failed against illustrative evidence",
    description:
      "Deterministic code compares the collected evidence against the control's pass/fail criteria. The result is FAILED — public principals are present. No LLM judgment is involved in the decision.",
    agent: "FAILED: 1 bucket has public principals. Evidence ID: ev-demo-001. Collected: just now.",
  },
  {
    title: "Plan",
    detail: "Remove the public binding and enforce prevention",
    description:
      "TrustFix generates the minimum-change remediation plan: remove only allUsers/allAuthenticatedUsers IAM bindings and enforce public access prevention. The full delta, impact, rollback path, and risk level are recorded.",
    agent: "Plan: Remove allUsers from roles/storage.objectViewer. Risk: MEDIUM. Rollback: restore captured IAM.",
  },
  {
    title: "Approve",
    detail: "A workspace owner approves the minimum change",
    description:
      "The remediation requires an explicit approval from an Owner or Security Reviewer. The approval is persisted with an idempotency key — duplicate submissions are safely rejected.",
    agent: "Approval record created. Idempotency key stored. Job queued for remediator.",
  },
  {
    title: "Verify",
    detail: "Anonymous object request returns 403",
    description:
      "After applying the change, an independent anonymous HTTP probe confirms that the bucket rejects unauthenticated requests. Only after this probe passes is the control marked VERIFIED and the answer composed.",
    agent: "Probe → gs://trustfix-public-storage-demo → HTTP 403 Forbidden. Control: VERIFIED.",
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

  // Auto-play logic
  useEffect(() => {
    if (!autoPlay) return;
    if (stage >= steps.length - 1) { setAutoPlay(false); return; }
    timerRef.current = setTimeout(advance, 1800);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [autoPlay, stage]);

  const current = steps[stage];

  return (
    <main className="marketing-page">
      <MarketingHeader />
      <PublicNotice />

      <section className="demo-hero">
        <span className="section-index">INTERACTIVE PRODUCT WALKTHROUGH</span>
        <h1>See the TrustFix loop before connecting a cloud.</h1>
        <p>
          This interface is illustrative. It demonstrates the exact decisions, approval boundary, and
          proof TrustFix produces in a real workspace.
        </p>
      </section>

      <section className="demo-console">
        {/* Console header */}
        <div className="demo-console-head">
          <div>
            <span className="micro">ILLUSTRATIVE SECURITY REVIEW</span>
            <h2>Is sensitive customer storage inaccessible from the public internet?</h2>
          </div>
          <span className={`status ${isVerified ? "verified" : stage >= 2 ? "failed" : "needs-review"}`}>
            {isVerified ? "Verified" : stage >= 2 ? "Failed" : "Scanning…"}
          </span>
        </div>

        {/* Controls */}
        <div className="demo-controls">
          <button
            className="button secondary"
            onClick={reset}
            aria-label="Reset walkthrough"
          >
            <ArrowCounterClockwise size={14} /> Reset
          </button>
          <button
            className="button primary"
            onClick={() => {
              if (stage >= steps.length - 1) { reset(); return; }
              if (autoPlay) { setAutoPlay(false); } else { setAutoPlay(true); }
            }}
          >
            <Play size={14} />
            {autoPlay ? "Pause" : stage >= steps.length - 1 ? "Replay" : "Auto-play"}
          </button>
          <label className="autoplay-label">
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
            />
            Auto-advance steps
          </label>
        </div>

        {/* Main grid */}
        <div className="demo-console-grid">
          {/* Step list */}
          <ol className="demo-steps" aria-label="Walkthrough steps">
            {steps.map(({ title, detail }, i) => {
              const state = i < stage ? "complete" : i === stage ? "active" : "pending";
              return (
                <li key={title} className={state}>
                  <span aria-hidden="true">
                    {i < stage || (isVerified && i === stage) ? (
                      <CheckCircle weight="fill" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <button
                    onClick={() => setStage(i)}
                    aria-current={i === stage ? "step" : undefined}
                    aria-label={`Step ${i + 1}: ${title}`}
                  >
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Proof panel */}
          <div className="demo-proof">
            <span
              className={`proof-icon ${
                isVerified ? "pass" : stage <= 1 ? "scanning" : "fail"
              }`}
            >
              {isVerified ? <LockKey size={22} /> : stage <= 1 ? <CloudCheck size={22} /> : <Warning size={22} />}
            </span>

            <span className="micro">STEP {stage + 1} / {steps.length} — {current.title.toUpperCase()}</span>
            <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{current.detail}</span>

            <div className="demo-detail">{current.description}</div>

            <dl>
              <div>
                <dt>Resource</dt>
                <dd><code>gs://trustfix-public-storage-demo</code></dd>
              </div>
              <div>
                <dt>Before</dt>
                <dd>Anonymous read allowed</dd>
              </div>
              <div>
                <dt>Planned delta</dt>
                <dd>Remove only public IAM principals</dd>
              </div>
              <div>
                <dt>Approval</dt>
                <dd>Owner required</dd>
              </div>
              <div>
                <dt>After</dt>
                <dd>{isVerified ? "403 Forbidden · Control VERIFIED" : stage < 5 ? "Not yet executed" : "Verifying…"}</dd>
              </div>
            </dl>

            <div className="demo-agent-log">
              {current.agent}
            </div>

            {stage < steps.length - 1 ? (
              <button className="button primary wide" onClick={advance}>
                Next step: {steps[stage + 1].title} <ArrowRight size={14} />
              </button>
            ) : (
              <button className="button secondary wide" onClick={reset}>
                <ArrowCounterClockwise size={14} /> Reset walkthrough
              </button>
            )}
          </div>
        </div>

        {/* Verified answer */}
        {isVerified && (
          <div className="demo-answer">
            <CloudCheck size={24} />
            <div>
              <span className="micro">EVIDENCE-BACKED ANSWER</span>
              <strong>Yes. Public access is denied.</strong>
              <p>
                Verified against bucket IAM and an anonymous access test. This public walkthrough uses
                illustrative data; a signed-in workspace performs the same steps against the configured
                disposable project.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="split-cta">
        <div>
          <span className="section-index">READY FOR REAL VERIFICATION?</span>
          <h2>Move from illustrative data to your protected workspace.</h2>
        </div>
        <a className="button primary" href="/app">
          Start for free <ArrowRight />
        </a>
      </section>

      <MarketingFooter />
    </main>
  );
}
