"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Check, CheckCircle, FileCsv, FileXls,
  MagnifyingGlass, ShieldCheck, UploadSimple, Warning, X,
} from "@phosphor-icons/react";
import { Status } from "@/components/status";
import { useToast } from "@/components/toast";

type Question = {
  id: string;
  question: string;
  control_id?: string;
  status?: "VERIFIED" | "FAILED" | "NEEDS_REVIEW" | "UNSUPPORTED";
  answer?: string;
  evidence_ids: string[];
};
type Review = { id: string; name: string; status: string; questions: Question[] };
type Plan = {
  id: string;
  control_id: string;
  resource: string;
  proposed_change: string;
  expected_result: string;
  potential_impact: string;
  rollback: string;
  risk: string;
  dependencies_checked: number;
};
type Job = { id: string; status: string; error?: string };

const api = "/api/trustfix/api";

type FilterType = "all" | "VERIFIED" | "FAILED" | "NEEDS_REVIEW";
const label = (status?: Question["status"]) =>
  status === "VERIFIED" ? "Verified" : status === "FAILED" ? "Failed" : "Needs review";

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, cache: "no-store" });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `Request failed (${r.status})`);
  return r.json();
}

export default function Reviews() {
  const [review, setReview] = useState<Review | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Question | null>(null);
  const [modal, setModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importName, setImportName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollStep, setPollStep] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const modalRef = useRef<HTMLElement>(null);
  const importModalRef = useRef<HTMLElement>(null);
  const { show } = useToast();

  const refresh = useCallback(async () => {
    let current: Review;
    try {
      current = await apiFetch<Review>(`${api}/reviews/demo/current`);
    } catch {
      current = await apiFetch<Review>(`${api}/reviews/demo`, { method: "POST" });
    }
    const planList = await apiFetch<Plan[]>(`${api}/remediations`);
    setReview(current);
    setPlans(planList);
    setSelected((prev) => current.questions.find((q) => q.id === prev?.id) ?? current.questions[0]);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);

  // Focus trap in remediation modal
  useEffect(() => {
    if (!modal) return;
    const el = modalRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setModal(false); return; }
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  async function waitFor(jobId: string, step: string) {
    setPollStep(step);
    setPolling(true);
    for (let i = 0; i < 90; i++) {
      const job = await apiFetch<Job>(`${api}/jobs/${jobId}`);
      if (job.status === "SUCCEEDED") return;
      if (job.status === "FAILED") throw new Error(job.error || "The operation failed");
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error("The operation is still running. Refresh to check its status.");
  }

  async function runReview() {
    if (!review) return;
    setBusy(true);
    setError("");
    try {
      const job = await apiFetch<{ job_id: string }>(`${api}/reviews/${review.id}/start`, { method: "POST" });
      await waitFor(job.job_id, "Scanning Google Cloud infrastructure…");
      await refresh();
      show("Live review completed", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Review failed";
      setError(msg);
      show(msg, "error");
    } finally {
      setBusy(false);
      setPolling(false);
      setPollStep("");
    }
  }

  const activePlan = plans.find((p) => p.control_id === selected?.control_id);

  async function approve() {
    if (!activePlan) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<{ job_id: string }>(
        `${api}/remediations/${activePlan.id}/approve`,
        { method: "POST", headers: { "Idempotency-Key": crypto.randomUUID() } },
      );
      setModal(false);
      await waitFor(result.job_id, "Applying remediation and verifying…");
      await refresh();
      show("Remediation applied and verified", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Remediation failed";
      setError(msg);
      show(msg, "error");
    } finally {
      setBusy(false);
      setPolling(false);
      setPollStep("");
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile || !importName.trim()) return;
    setImporting(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", importName.trim());
      formData.append("file", importFile);
      const res = await fetch(`${api}/reviews/import`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed");
      setImportModal(false);
      setImportFile(null);
      setImportName("");
      setReview(data);
      setSelected(data.questions[0] || null);
      show(`Imported questionnaire "${data.name}" with ${data.questions.length} questions`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setError(msg);
      show(msg, "error");
    } finally {
      setImporting(false);
    }
  }

  const counts = useMemo(() => ({
    verified: review?.questions.filter((q) => q.status === "VERIFIED").length ?? 0,
    failed: review?.questions.filter((q) => q.status === "FAILED").length ?? 0,
    review: review?.questions.filter((q) => q.status === "NEEDS_REVIEW" || q.status === "UNSUPPORTED").length ?? 0,
  }), [review]);

  const displayed = useMemo(() => {
    if (!review) return [];
    return review.questions.filter((q) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "NEEDS_REVIEW"
          ? q.status === "NEEDS_REVIEW" || q.status === "UNSUPPORTED"
          : q.status === filter);
      const matchesSearch = !search || q.question.toLowerCase().includes(search.toLowerCase()) ||
        (q.control_id?.toLowerCase().includes(search.toLowerCase()) ?? false);
      return matchesFilter && matchesSearch;
    });
  }, [review, filter, search]);

  if (!review) {
    return (
      <main className="page">
        <div className="empty-state">
          <h2>Loading security review</h2>
          <p>{error || "Preparing your authenticated workspace…"}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page review-page">
      {/* Header */}
      <div className="page-heading review-title">
        <div>
          <span className="breadcrumb">REVIEWS / LIVE WORKSPACE TARGET</span>
          <div className="title-line">
            <h1>{review.name}</h1>
            <span className="status needs-review">{review.status}</span>
          </div>
          <p>{review.questions.length} questions · persisted in Firestore</p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={() => setImportModal(true)}>
            <UploadSimple /> Import CSV/XLSX
          </button>
          <a className="button secondary" href={`${api}/reviews/${review.id}/export.csv`}>
            <FileCsv /> Export CSV
          </a>
          <a className="button secondary" href={`${api}/reviews/${review.id}/export.xlsx`}>
            <FileXls /> Export XLSX
          </a>
          <button className="button primary" disabled={busy} onClick={runReview}>
            {busy ? "Working…" : "Run live review"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-banner" role="alert">
          <Warning size={16} />
          <span>{error}</span>
          <button
            style={{ marginLeft: "auto", background: "transparent", border: 0, cursor: "pointer" }}
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Polling progress */}
      {polling && (
        <div className="polling-progress" role="status">
          <div className="polling-dots">
            <span /><span /><span />
          </div>
          <span>{pollStep}</span>
        </div>
      )}

      {/* Summary bar */}
      <div className="review-summary">
        <div><strong>{counts.verified}</strong><span>Verified</span></div>
        <div><strong>{counts.failed}</strong><span>Failed</span></div>
        <div><strong>{counts.review}</strong><span>Needs review</span></div>
        <div className="summary-track">
          <span style={{ width: `${review.questions.length ? (counts.verified / review.questions.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Table tools */}
      <div className="table-tools">
        <label className="search">
          <MagnifyingGlass size={14} />
          <input
            type="search"
            placeholder="Search questions or controls…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search questions"
          />
        </label>
        <div className="filter-tabs" role="tablist" aria-label="Filter by status">
          {(["all", "VERIFIED", "FAILED", "NEEDS_REVIEW"] as FilterType[]).map((f) => {
            const tabLabel = f === "all" ? "All" : f === "VERIFIED" ? "Verified" : f === "FAILED" ? "Failed" : "Needs review";
            const tabCount = f === "all" ? review.questions.length : f === "NEEDS_REVIEW" ? counts.review : f === "VERIFIED" ? counts.verified : counts.failed;
            return (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {tabLabel} <span>{tabCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table + Detail pane */}
      <div className={`review-layout ${selected ? "with-detail" : ""}`}>
        <section className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Question</th>
                <th>Control</th>
                <th>Status</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                    No questions match your filter.
                  </td>
                </tr>
              ) : (
                displayed.map((q) => (
                  <tr
                    key={q.id}
                    className={q.id === selected?.id ? "selected" : ""}
                    onClick={() => setSelected(q)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelected(q); }}
                    role="row"
                    aria-selected={q.id === selected?.id}
                  >
                    <td><strong>{q.question}</strong></td>
                    <td>{q.control_id || <span style={{ color: "var(--muted)" }}>Not supported</span>}</td>
                    <td><Status value={label(q.status)} /></td>
                    <td>{q.evidence_ids.length} items</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {selected && (
          <aside className="detail-pane">
            <div className="detail-content">
              <span className="overline">LIVE CONTROL RESULT</span>
              <h2>{selected.question}</h2>
              <Status value={label(selected.status)} />

              {/* Agent steps */}
              <div className="agent-steps">
                <h3>Agent run</h3>
                <div className="done">
                  <span><Check size={13} /></span>
                  Requirement interpreted
                </div>
                <div className="done">
                  <span><Check size={13} /></span>
                  Disposable GCP project inspected
                </div>
                <div className={selected.status === "FAILED" ? "fail" : selected.status ? "done" : "waiting"}>
                  <span>
                    {selected.status === "FAILED" ? <X size={13} /> :
                     selected.status ? <Check size={13} /> : "3"}
                  </span>
                  {selected.status === "FAILED"
                    ? "Control failed against live evidence"
                    : selected.status === "VERIFIED"
                    ? "Result recorded without invented evidence"
                    : "Awaiting inspection"}
                </div>
              </div>

              {/* Finding / Verification card */}
              <section className="detail-section">
                <h3>{selected.status === "VERIFIED" ? "Verification" : "Finding"}</h3>
                <div className={`finding-card ${selected.status === "VERIFIED" ? "fixed" : selected.status === "NEEDS_REVIEW" || selected.status === "UNSUPPORTED" ? "pending" : ""}`}>
                  <div className="finding-card-head">
                    <span className="finding-icon critical">
                      {selected.status === "VERIFIED" ? <ShieldCheck /> : <Warning />}
                    </span>
                    <div>
                      <strong>
                        {selected.status === "FAILED"
                          ? "Public access detected"
                          : selected.status === "VERIFIED"
                          ? "Control verified"
                          : "Manual evidence required"}
                      </strong>
                      <small>{selected.answer || "Evidence was collected directly from Google Cloud."}</small>
                    </div>
                  </div>
                </div>
              </section>

              {/* Remediation button */}
              {selected.status === "FAILED" && activePlan && (
                <button className="button primary wide" onClick={() => setModal(true)}>
                  Review remediation <ArrowRight size={15} />
                </button>
              )}

              {/* Verified answer */}
              {selected.status === "VERIFIED" && (
                <div className="answer-card">
                  <span className="overline">EVIDENCE-BACKED ANSWER</span>
                  <strong>Yes.</strong>
                  <p>{selected.answer || "Verified against live infrastructure."}</p>
                  <small><CheckCircle weight="fill" /> Stored in the audit record</small>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Remediation modal */}
      {modal && activePlan && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <section
            ref={modalRef}
            className="remediation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remediation-title"
          >
            <header>
              <div>
                <span className="overline">REMEDIATION APPROVAL</span>
                <h2 id="remediation-title">Apply minimum safe change</h2>
              </div>
              <button onClick={() => setModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            <div className="risk-strip">
              <span className={`risk ${activePlan.risk.toLowerCase()}`}>
                {activePlan.risk} RISK
              </span>
              <p>Execution is queued only after your signed-in approval.</p>
            </div>
            <div className="remediation-grid">
              <div className="full">
                <span>RESOURCE</span>
                <strong className="mono">{activePlan.resource}</strong>
              </div>
              <div className="full">
                <span>PROPOSED CHANGE</span>
                <strong>{activePlan.proposed_change}</strong>
              </div>
              <div>
                <span>EXPECTED RESULT</span>
                <strong>{activePlan.expected_result}</strong>
              </div>
              <div>
                <span>DEPENDENCIES CHECKED</span>
                <strong>{activePlan.dependencies_checked}</strong>
              </div>
              <div className="full impact">
                <span>POTENTIAL IMPACT</span>
                <p>{activePlan.potential_impact}</p>
              </div>
              <div className="full">
                <span>ROLLBACK</span>
                <p>{activePlan.rollback}</p>
              </div>
            </div>
            {error && <div style={{ padding: "0 24px 12px" }} className="error-banner" role="alert"><Warning size={14} />{error}</div>}
            <footer>
              <button className="button secondary" onClick={() => setModal(false)}>
                Reject
              </button>
              <button className="button primary" disabled={busy} onClick={approve}>
                {busy ? "Applying…" : "Approve & remediate"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Questionnaire Import Modal */}
      {importModal && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setImportModal(false); }}>
          <section
            ref={importModalRef}
            className="import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <header>
              <div>
                <span className="overline">QUESTIONNAIRE INGESTION</span>
                <h2 id="import-title">Import security questionnaire</h2>
              </div>
              <button onClick={() => setImportModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </header>
            <form onSubmit={handleImportSubmit}>
              <section>
                <label>
                  Review title
                  <input
                    type="text"
                    required
                    placeholder="Q3 Vendor Assessment — Acme Corp"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                  />
                </label>
                <label>
                  Upload questionnaire file (.csv or .xlsx)
                  <div
                    className={`file-drop ${importFile ? "has-file" : ""}`}
                    onClick={() => {
                      const input = document.getElementById("q-file-input");
                      input?.click();
                    }}
                  >
                    <UploadSimple size={28} />
                    <p>
                      {importFile
                        ? `Selected: ${importFile.name} (${(importFile.size / 1024).toFixed(1)} KB)`
                        : "Click or drag a CSV or XLSX file here"}
                    </p>
                    <input
                      id="q-file-input"
                      type="file"
                      accept=".csv, .xlsx"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) setImportFile(e.target.files[0]);
                      }}
                    />
                  </div>
                </label>
              </section>
              <footer>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setImportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={importing || !importFile || !importName.trim()}
                >
                  {importing ? "Importing…" : "Import & map questions"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
