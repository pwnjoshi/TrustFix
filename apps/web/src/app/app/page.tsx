"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise, ArrowRight, Brain, CheckCircle, Cloud, DownloadSimple,
  Fingerprint, Lightning, ListChecks, Play, Pulse, ShieldCheck, Sparkle,
  Stack, Warning,
} from "@phosphor-icons/react";
import { DashboardSkeleton } from "@/components/skeleton";
import { useToast } from "@/components/toast";

const api = "/api/trustfix/api";

type Question = { status?: string; question: string; control_id?: string };
type Review = { id: string; name: string; status: string; questions: Question[]; updated_at: string };
type Job = { id: string; kind: string; status: string; phase: string; progress: number; updated_at: string };
type Activity = { id: string; actor: string; action: string; resource: string; result: string; timestamp: string };
type Center = {
  workspace?: { name?: string; organization_name?: string };
  target_project?: string;
  connection_status: "NOT_CONFIGURED" | "VERIFICATION_REQUIRED" | "VERIFIED";
  connection_verified: boolean;
  last_verified?: string;
  assurance_score: number;
  verified_controls: number;
  failed_controls: number;
  pending_approvals: number;
  evidence_count: number;
  live_evidence_count: number;
  latest_review?: Review;
  jobs: Job[];
  activity: Activity[];
  model: string;
};

function relativeTime(value?: string) {
  if (!value) return "Not yet";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function scoreLabel(score: number) {
  if (score >= 80) return "Strong posture";
  if (score >= 50) return "Action recommended";
  return "Assurance gap detected";
}

export default function Dashboard() {
  const [center, setCenter] = useState<Center | null | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const { show } = useToast();

  const load = useCallback(async (announce = false) => {
    if (announce) setRefreshing(true);
    try {
      const response = await fetch(`${api}/command-center`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Command Center could not load");
      setCenter(body);
      setLastSynced(new Date());
      if (announce) show("Command Center refreshed", "success");
    } catch (error) {
      setCenter((current) => current === undefined ? null : current);
      if (announce) show(error instanceof Error ? error.message : "Command Center could not load", "error");
    } finally {
      if (announce) setRefreshing(false);
    }
  }, [show]);

  useEffect(() => {
    load();
    const refreshVisible = () => { if (document.visibilityState === "visible") load(); };
    const timer = window.setInterval(refreshVisible, 15_000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [load]);

  async function runReview() {
    if (!center?.latest_review) return;
    setRunning(true);
    try {
      const response = await fetch(`${api}/reviews/${center.latest_review.id}/start`, { method: "POST" });
      const queued = await response.json();
      if (!response.ok) throw new Error(queued.detail || "Could not start assurance run");
      show("Autonomous assurance scan initiated across live target", "info");
      for (let attempt = 0; attempt < 90; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await load();
        const jobResponse = await fetch(`${api}/jobs/${queued.job_id}`, { cache: "no-store" });
        const job = await jobResponse.json();
        if (job.status === "SUCCEEDED") { await load(); show("Live evidence collected and posture verified", "success"); return; }
        if (job.status === "FAILED") throw new Error(job.error || "Assurance scan failed");
      }
      throw new Error("The run is continuing in the background. Mission Control will keep its status.");
    } catch (error) {
      show(error instanceof Error ? error.message : "Assurance run failed", "error");
    } finally {
      setRunning(false);
    }
  }

  const questions = useMemo(() => center?.latest_review?.questions || [], [center]);
  const supportedQuestions = questions.filter((item) => item.status !== "UNSUPPORTED");
  const needsAttention = questions.filter((item) => item.status === "FAILED" || item.status === "NEEDS_REVIEW");
  const activeJob = center?.jobs.find((job) => job.status === "RUNNING" || job.status === "QUEUED");
  const coverage = questions.length ? Math.round((supportedQuestions.length / questions.length) * 100) : 0;

  if (center === undefined) return <DashboardSkeleton />;
  if (!center) return <main className="page"><section className="empty-state"><Warning size={28}/><h2>Command Center unavailable</h2><p>Reload the workspace or check System health.</p><button className="button secondary" onClick={() => load(true)}>Retry</button></section></main>;

  if (!center.connection_verified) return <main className="page command-center">
    <header className="command-hero"><div><span className="breadcrumb">TRUSTFIX / CONNECTION REQUIRED</span><h1>Verify cloud access before assurance begins.</h1><p>A project name alone is not a connection. TrustFix unlocks evidence and operations only after its scanner inspects the exact target.</p></div><Link className="button primary glow" href="/app/integrations">Configure integration <ArrowRight/></Link></header>
    <section className="connection-gate"><div className="connection-gate-icon"><Cloud weight="duotone"/></div><span className="status needs-review">{center.connection_status === "NOT_CONFIGURED" ? "Project required" : "Verification required"}</span><h2>{center.target_project ? `${center.target_project} is configured, not verified` : "No Google Cloud target configured"}</h2><p>Grant the TrustFix scanner read access in that Google Cloud project, then run verification. Historical data from other projects is intentionally hidden.</p><ol><li><span>01</span><div><strong>Select the boundary</strong><small>Enter a real Google Cloud project ID—not a display name.</small></div></li><li><span>02</span><div><strong>Grant scanner IAM</strong><small>A dedicated keyless service account receives read-only access.</small></div></li><li><span>03</span><div><strong>Verify fresh evidence</strong><small>TrustFix tests live APIs before enabling operations.</small></div></li></ol><Link className="button primary" href="/app/integrations">Open Google Cloud setup <ArrowRight/></Link></section>
  </main>;

  const score = center.assurance_score;
  const proofPackUrl = center.latest_review ? `${api}/reviews/${center.latest_review.id}/proof-pack.json` : undefined;
  const evidenceFreshness = relativeTime(center.last_verified);

  return <main className="page command-center">
    <header className="command-hero">
      <div><span className="breadcrumb">{center.workspace?.organization_name || center.workspace?.name || "TRUSTFIX"} / COMMAND CENTER</span><h1>Cloud assurance, continuously proven.</h1><p>See live posture, agent work, governed decisions, and evidence from one operational view.</p></div>
      <div className="command-actions"><span className="live-sync" title={lastSynced?.toLocaleString()}><span/>Live · {lastSynced ? relativeTime(lastSynced.toISOString()) : "connecting"}</span><button className="button secondary" onClick={() => load(true)} disabled={refreshing}><ArrowClockwise className={refreshing ? "spin" : ""}/>{refreshing ? "Refreshing…" : "Refresh"}</button>{proofPackUrl && <a className="button secondary" href={proofPackUrl}><DownloadSimple/> Proof Pack</a>}<button className="button primary glow" onClick={runReview} disabled={running || !center.latest_review}><Play weight="fill"/>{running ? "Inspecting live target…" : "Run assurance"}</button></div>
    </header>

    <section className="boundary-status" aria-label="Verified Google Cloud boundary">
      <div><span className="boundary-icon"><Cloud weight="duotone"/></span><p><small>VERIFIED TARGET</small><strong>{center.target_project}</strong></p></div>
      <div><small>LAST LIVE VERIFICATION</small><strong>{evidenceFreshness}</strong></div>
      <div><small>CONTROL COVERAGE</small><strong>{supportedQuestions.length}/{questions.length || 0} · {coverage}%</strong></div>
      <span className="status verified"><CheckCircle weight="fill"/> Live boundary</span>
    </section>

    <section className="assurance-overview">
      <article className="assurance-score-card"><div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><div><strong>{score}</strong><span>/100</span></div></div><div><span className="overline">ASSURANCE SCORE</span><h2>{scoreLabel(score)}</h2><p>Calculated only from supported, evidence-backed controls.</p><div className="coverage-track" aria-label={`${coverage}% control coverage`}><span style={{ width: `${coverage}%` }}/></div><small>{coverage}% of imported questions map to supported controls</small></div></article>
      <div className="command-metrics"><article><CheckCircle/><span>Verified</span><strong>{center.verified_controls}</strong><small>Live controls passing</small></article><article><Warning/><span>Failed</span><strong>{center.failed_controls}</strong><small>Require attention</small></article><article><ShieldCheck/><span>Approvals</span><strong>{center.pending_approvals}</strong><small>Governed actions waiting</small></article><article><Fingerprint/><span>Evidence</span><strong>{center.evidence_count}</strong><small>{center.live_evidence_count} live records</small></article></div>
    </section>

    <section className="quick-action-grid" aria-label="Workspace shortcuts">
      <Link href="/app/reviews"><span><ListChecks/></span><div><strong>Review controls</strong><small>{needsAttention.length} items need attention</small></div><ArrowRight/></Link>
      <Link href="/app/findings"><span><Warning/></span><div><strong>Govern findings</strong><small>{center.pending_approvals} approvals waiting</small></div><ArrowRight/></Link>
      <Link href="/app/evidence"><span><Stack/></span><div><strong>Inspect evidence</strong><small>{center.live_evidence_count} live records</small></div><ArrowRight/></Link>
      <Link href="/app/integrations"><span><Cloud/></span><div><strong>Manage boundary</strong><small>{center.target_project}</small></div><ArrowRight/></Link>
    </section>

    <section className="mission-panel"><div className="mission-heading"><div><span className="overline">AGENT MISSION CONTROL</span><h2>Observe every autonomous step</h2></div><span className={`live-pill ${activeJob ? "active" : ""}`}><span/>{activeJob ? "Agent active" : "Standing by"}</span></div><div className="mission-grid"><div className="agent-core"><div className="agent-orbit"><Brain weight="duotone"/><span className="orbit-dot one"/><span className="orbit-dot two"/></div><strong>TrustFix Orchestrator</strong><small>{center.model} · Google ADK</small><div className="target-chip"><Cloud/> {center.target_project}</div></div><div className="mission-stream">{(center.jobs.length ? center.jobs.slice(0, 5) : [{ id: "idle", kind: "READY", status: "READY", phase: "Ready for the next assurance run", progress: 0, updated_at: new Date().toISOString() }]).map((job, index) => <article key={job.id} className={index === 0 ? "current" : ""}><span className={`mission-state ${job.status.toLowerCase()}`}>{job.status === "SUCCEEDED" ? <CheckCircle weight="fill"/> : job.status === "FAILED" ? <Warning weight="fill"/> : <Pulse/>}</span><div><strong>{job.phase}</strong><small>{job.kind} · {relativeTime(job.updated_at)}</small>{job.status === "RUNNING" && <div className="mission-progress"><span style={{ width: `${job.progress}%` }}/></div>}</div><code>{job.id.slice(0, 8)}</code></article>)}</div></div></section>

    <div className="command-lower-grid"><section className="panel attention-panel"><div className="panel-heading"><div><span className="overline">PRIORITIZED NEXT ACTIONS</span><h2>What needs attention</h2></div><span className="count">{needsAttention.length}</span></div>{needsAttention.length ? needsAttention.slice(0, 4).map((item) => <Link href="/app/reviews" className="action-row" key={item.question}><span className="severity-dot"/><div><strong>{item.question}</strong><small>{item.control_id || "Manual evidence required"}</small></div><ArrowRight/></Link>) : <div className="celebration-empty"><Sparkle weight="duotone"/><strong>No urgent control failures</strong><p>Run assurance again to refresh the evidence boundary.</p></div>}</section><section className="panel audit-panel"><div className="panel-heading"><div><span className="overline">EVIDENCE LINEAGE</span><h2>Recent verified activity</h2></div><Link href="/app/activity">Full audit <ArrowRight/></Link></div>{center.activity.length ? center.activity.slice(0, 5).map((event) => <article key={event.id}><span className="audit-node"><Lightning/></span><div><strong>{event.action}</strong><small>{event.actor} · {event.resource}</small></div><time>{relativeTime(event.timestamp)}</time></article>) : <div className="celebration-empty compact"><Pulse/><strong>Activity appears after the first run</strong></div>}</section></div>
  </main>;
}
