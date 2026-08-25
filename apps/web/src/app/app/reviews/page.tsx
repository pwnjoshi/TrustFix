"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle, FileCsv, ShieldCheck, Warning, X } from "@phosphor-icons/react";
import { Status } from "@/components/status";

type Question = { id: string; question: string; control_id?: string; status?: "VERIFIED" | "FAILED" | "NEEDS_REVIEW" | "UNSUPPORTED"; answer?: string; evidence_ids: string[] };
type Review = { id: string; name: string; status: string; questions: Question[] };
type Plan = { id: string; control_id: string; resource: string; proposed_change: string; expected_result: string; potential_impact: string; rollback: string; risk: string; dependencies_checked: number };
type Job = { id: string; status: string; error?: string };
const api = "/api/trustfix/api";
const label = (status?: Question["status"]) => status === "VERIFIED" ? "Verified" : status === "FAILED" ? "Failed" : "Needs review";

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || `Request failed (${response.status})`);
  return response.json();
}

export default function Reviews() {
  const [review, setReview] = useState<Review | null>(null), [plans, setPlans] = useState<Plan[]>([]), [selected, setSelected] = useState<Question | null>(null);
  const [modal, setModal] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const refresh = useCallback(async () => {
    let current: Review;
    try { current = await json<Review>(`${api}/reviews/demo/current`); } catch { current = await json<Review>(`${api}/reviews/demo`, { method: "POST" }); }
    setReview(current); setPlans(await json<Plan[]>(`${api}/remediations`));
    setSelected((previous) => current.questions.find((item) => item.id === previous?.id) || current.questions[0]);
  }, []);
  useEffect(() => { refresh().catch((reason) => setError(reason.message)); }, [refresh]);
  async function waitFor(jobId: string) {
    for (let count = 0; count < 90; count += 1) {
      const job = await json<Job>(`${api}/jobs/${jobId}`);
      if (job.status === "SUCCEEDED") return;
      if (job.status === "FAILED") throw new Error(job.error || "The operation failed");
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("The operation is still running. Refresh to check its status.");
  }
  async function runReview() {
    if (!review) return; setBusy(true); setError("");
    try { const job = await json<{ job_id: string }>(`${api}/reviews/${review.id}/start`, { method: "POST" }); await waitFor(job.job_id); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Review failed"); } finally { setBusy(false); }
  }
  const activePlan = plans.find((plan) => plan.control_id === selected?.control_id);
  async function approve() {
    if (!activePlan) return; setBusy(true); setError("");
    try { const result = await json<{ job_id: string }>(`${api}/remediations/${activePlan.id}/approve`, { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } }); setModal(false); await waitFor(result.job_id); await refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Remediation failed"); } finally { setBusy(false); }
  }
  const counts = useMemo(() => ({ verified: review?.questions.filter((item) => item.status === "VERIFIED").length || 0, failed: review?.questions.filter((item) => item.status === "FAILED").length || 0, review: review?.questions.filter((item) => item.status === "NEEDS_REVIEW" || item.status === "UNSUPPORTED").length || 0 }), [review]);
  if (!review) return <main className="page"><div className="empty-state"><h2>Loading security review</h2><p>{error || "Preparing your authenticated workspace…"}</p></div></main>;
  return <main className="page review-page">
    <div className="page-heading review-title"><div><span className="breadcrumb">REVIEWS / LIVE DEMO TARGET</span><div className="title-line"><h1>{review.name}</h1><span className="status needs-review">{review.status}</span></div><p>{review.questions.length} questions · persisted in Firestore</p></div><div className="heading-actions"><a className="button secondary" href={`${api}/reviews/${review.id}/export.csv`}><FileCsv/> Export</a><button className="button primary" disabled={busy} onClick={runReview}>{busy ? "Working…" : "Run live review"}</button></div></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <div className="review-summary"><div><strong>{counts.verified}</strong><span>Verified</span></div><div><strong>{counts.failed}</strong><span>Failed</span></div><div><strong>{counts.review}</strong><span>Needs review</span></div><div className="summary-track"><span style={{width: `${review.questions.length ? counts.verified / review.questions.length * 100 : 0}%`}}/></div></div>
    <div className="review-layout with-detail"><section className="table-wrap"><table><thead><tr><th>Question</th><th>Control</th><th>Status</th><th>Evidence</th></tr></thead><tbody>{review.questions.map((item) => <tr key={item.id} className={item.id === selected?.id ? "selected" : ""} onClick={() => setSelected(item)}><td><strong>{item.question}</strong></td><td>{item.control_id || "Not supported"}</td><td><Status value={label(item.status)}/></td><td>{item.evidence_ids.length} items</td></tr>)}</tbody></table></section>
      {selected && <aside className="detail-pane"><div className="detail-content"><span className="overline">LIVE CONTROL RESULT</span><h2>{selected.question}</h2><Status value={label(selected.status)}/><div className="agent-steps"><h3>Agent run</h3><div className="done"><span><Check size={13}/></span>Requirement interpreted</div><div className="done"><span><Check size={13}/></span>Disposable GCP project inspected</div><div className={selected.status === "FAILED" ? "fail" : "done"}><span>{selected.status === "FAILED" ? <X size={13}/> : <Check size={13}/>}</span>{selected.status === "FAILED" ? "Control failed against live evidence" : "Result recorded without invented evidence"}</div></div><section className="detail-section"><h3>{selected.status === "VERIFIED" ? "Verification" : "Finding"}</h3><div className={`finding-card ${selected.status === "VERIFIED" ? "fixed" : ""}`}><div className="finding-card-head"><span className="finding-icon critical">{selected.status === "VERIFIED" ? <ShieldCheck/> : <Warning/>}</span><div><strong>{selected.status === "FAILED" ? "Public access detected" : selected.status === "VERIFIED" ? "Control verified" : "Manual evidence required"}</strong><small>{selected.answer || "Evidence was collected directly from Google Cloud."}</small></div></div></div></section>{selected.status === "FAILED" && activePlan && <button className="button primary wide" onClick={() => setModal(true)}>Review remediation <ArrowRight size={15}/></button>}{selected.status === "VERIFIED" && <div className="answer-card"><span className="overline">EVIDENCE-BACKED ANSWER</span><strong>Yes.</strong><p>{selected.answer || "Verified against live infrastructure."}</p><small><CheckCircle weight="fill"/> Stored in the audit record</small></div>}</div></aside>}
    </div>
    {modal && activePlan && <div className="modal-backdrop"><section className="remediation-modal" role="dialog" aria-modal="true" aria-labelledby="remediation-title"><header><div><span className="overline">REMEDIATION APPROVAL</span><h2 id="remediation-title">Apply minimum safe change</h2></div><button onClick={() => setModal(false)} aria-label="Close"><X size={20}/></button></header><div className="risk-strip"><span className="risk medium">{activePlan.risk} RISK</span><p>Execution is queued only after your signed-in approval.</p></div><div className="remediation-grid"><div className="full"><span>RESOURCE</span><strong className="mono">{activePlan.resource}</strong></div><div className="full"><span>PROPOSED CHANGE</span><strong>{activePlan.proposed_change}</strong></div><div><span>EXPECTED RESULT</span><strong>{activePlan.expected_result}</strong></div><div><span>DEPENDENCIES CHECKED</span><strong>{activePlan.dependencies_checked}</strong></div><div className="full impact"><span>POTENTIAL IMPACT</span><p>{activePlan.potential_impact}</p></div><div className="full"><span>ROLLBACK</span><p>{activePlan.rollback}</p></div></div><footer><button className="button secondary" onClick={() => setModal(false)}>Reject</button><button className="button primary" disabled={busy} onClick={approve}>{busy ? "Applying…" : "Approve & remediate"}</button></footer></section></div>}
  </main>;
}
