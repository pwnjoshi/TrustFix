"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle, Cloud, Play, Warning } from "@phosphor-icons/react";
import { DashboardSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";

const api = "/api/trustfix/api";

type Question = { status?: string; question: string; control_id?: string };
type Review = { id: string; name: string; status: string; questions: Question[] };
type Connection = { status: string; project?: string; evidence_count: number; last_verified?: string };

export default function Dashboard() {
  const [review, setReview] = useState<Review | null | undefined>(undefined);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [running, setRunning] = useState(false);
  const { show } = useToast();

  async function load() {
    try {
      const [reviewRes, connRes] = await Promise.all([
        fetch(`${api}/reviews/demo/current`, { cache: "no-store" })
          .then(async (r) => (r.status === 404 ? fetch(`${api}/reviews/demo`, { method: "POST" }) : r))
          .then((r) => r.json()),
        fetch(`${api}/integrations/google-cloud`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setReview(reviewRes);
      setConnection(connRes);
    } catch (e) {
      setReview(null);
      show(e instanceof Error ? e.message : "Could not load dashboard", "error");
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function runReview() {
    if (!review) return;
    setRunning(true);
    try {
      const jobRes = await fetch(`${api}/reviews/${review.id}/start`, { method: "POST" });
      const job = await jobRes.json();
      if (!jobRes.ok) throw new Error(job.detail || "Could not start review");
      show("Live review started — results will update shortly", "info");
      // Poll for completion
      for (let i = 0; i < 90; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const j = await fetch(`${api}/jobs/${job.job_id}`, { cache: "no-store" }).then((r) => r.json());
        if (j.status === "SUCCEEDED") { await load(); show("Review completed", "success"); return; }
        if (j.status === "FAILED") throw new Error(j.error || "Review failed");
      }
    } catch (e) {
      show(e instanceof Error ? e.message : "Review failed", "error");
    } finally {
      setRunning(false);
    }
  }

  // Show skeleton while loading
  if (review === undefined) return <DashboardSkeleton />;

  const counts = review?.questions.reduce(
    (sum, q) => ({ ...sum, [q.status || "NEEDS_REVIEW"]: (sum[q.status || "NEEDS_REVIEW"] || 0) + 1 }),
    {} as Record<string, number>,
  ) || {};

  const total = review?.questions.length || 0;
  const verified = counts.VERIFIED || 0;
  const failed = review?.questions.filter((q) => q.status === "FAILED") || [];
  const progressPct = total > 0 ? (verified / total) * 100 : 0;

  return (
    <main className="page dashboard">
      <div className="page-heading">
        <div>
          <span className="breadcrumb">TRUSTFIX / OVERVIEW</span>
          <h1>Security assurance</h1>
          <p>Live posture across the connected disposable Google Cloud project.</p>
        </div>
        <button
          className="button primary"
          onClick={runReview}
          disabled={running || !review}
          style={{ marginTop: 8 }}
        >
          <Play size={14} />
          {running ? "Running…" : "Run live review"}
        </button>
      </div>

      <section className="metrics">
        <article>
          <span>Active reviews</span>
          <strong>{review ? 1 : 0}</strong>
          <small>{review?.status || "No review"}</small>
        </article>
        <article>
          <span>Verified controls</span>
          <strong>{verified}</strong>
          <small className="positive"><CheckCircle /> Evidence backed</small>
        </article>
        <article>
          <span>Failed controls</span>
          <strong>{counts.FAILED || 0}</strong>
          <small className={counts.FAILED ? "negative" : ""}>
            {counts.FAILED ? <><Warning /> Action required</> : "All clear"}
          </small>
        </article>
        <article>
          <span>Needs review</span>
          <strong>{(counts.NEEDS_REVIEW || 0) + (counts.UNSUPPORTED || 0)}</strong>
          <small>Manual review</small>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel current-review">
          <div className="panel-heading">
            <div>
              <span className="overline">CURRENT SECURITY REVIEW</span>
              <h2>{review?.name || "No review yet"}</h2>
            </div>
            <Link href="/app/reviews">
              Open review <ArrowRight size={15} />
            </Link>
          </div>
          <div className="review-progress">
            <div className="score">
              <strong>{verified}</strong>
              <span>/ {total} verified</span>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progressPct}%` }} />
            </div>
            <div className="progress-legend">
              <span><span className="legend verified" />Verified ({verified})</span>
              <span><span className="legend failed" />Failed ({counts.FAILED || 0})</span>
            </div>
          </div>
          <div className="review-meta">
            <div>
              <span>Status</span>
              <strong>{review?.status || "—"}</strong>
            </div>
            <div>
              <span>Target</span>
              <strong>{connection?.project || "Not configured"}</strong>
            </div>
            <div>
              <span>Evidence records</span>
              <strong>{connection?.evidence_count ?? 0}</strong>
            </div>
          </div>
        </section>

        <section className="panel findings">
          <div className="panel-heading">
            <div>
              <span className="overline">FINDINGS REQUIRING ACTION</span>
              <h2>Open findings</h2>
            </div>
            <span className="count">{failed.length}</span>
          </div>
          {failed.length > 0 ? (
            failed.map((q) => (
              <Link href="/app/reviews" className="finding-row" key={q.question}>
                <span className="finding-icon critical"><Warning size={18} /></span>
                <div>
                  <strong>{q.question}</strong>
                  <small>{q.control_id}</small>
                </div>
                <ArrowRight />
              </Link>
            ))
          ) : (
            <div className="finding-row">
              <span className="finding-icon info"><CheckCircle /></span>
              <div>
                <strong>{review ? "No failed controls" : "Run a review first"}</strong>
                <small>{review ? "All controls passing" : "Click 'Run live review' above"}</small>
              </div>
            </div>
          )}
        </section>

        <section className="panel connection" style={{ gridColumn: "1 / -1" }}>
          <div className="panel-heading">
            <div>
              <span className="overline">CLOUD CONNECTION</span>
              <h2>Google Cloud</h2>
            </div>
            <span className={`status ${connection?.status === "CONNECTED" ? "verified" : "needs-review"}`}>
              {connection?.status === "CONNECTED" ? "Connected" : "Not configured"}
            </span>
          </div>
          <div className="cloud-mark"><Cloud size={26} /></div>
          <dl>
            <div><dt>Project</dt><dd>{connection?.project || "—"}</dd></div>
            <div><dt>Evidence</dt><dd>{connection?.evidence_count ?? 0} records</dd></div>
            <div>
              <dt>Last verified</dt>
              <dd>
                {connection?.last_verified
                  ? new Date(connection.last_verified).toLocaleString()
                  : "Run verification"}
              </dd>
            </div>
          </dl>
          <Link href="/app/integrations" className="button secondary wide">
            Manage connection
          </Link>
        </section>
      </div>
    </main>
  );
}
