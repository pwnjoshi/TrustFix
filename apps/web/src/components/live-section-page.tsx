"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowSquareOut, Check, CheckCircle, Cloud, Copy, HardDrives, Info, LockKey,
  Pulse, ShieldWarning, UserPlus, Warning,
} from "@phosphor-icons/react";
import { useToast } from "./toast";

const api = "/api/trustfix/api";
type Json = Record<string, unknown>;

function Heading({ title, description }: { title: string; description: string }) {
  return (
    <div className="page-heading">
      <div>
        <span className="breadcrumb">TRUSTFIX / {title.toUpperCase()}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="empty-state">
      <Info size={28} />
      <h2>Loading live workspace data</h2>
      <p>Reading from TrustFix.</p>
    </div>
  );
}

function Failure({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="empty-state" role="alert">
      <Warning size={28} color="var(--red)" />
      <h2>Could not load this page</h2>
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>Retry</button>
      )}
    </div>
  );
}

/** Format a datetime string to a relative time string */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function useLiveRefresh(refresh: () => void, intervalMs = 15_000) {
  useEffect(() => {
    const refreshVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const timer = window.setInterval(refreshVisible, intervalMs);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [intervalMs, refresh]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Integrations Page
// ─────────────────────────────────────────────────────────────────────────────
export function IntegrationsPage() {
  const [connection, setConnection] = useState<Json | null>(null);
  const [project, setProject] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const { show } = useToast();

  const load = useCallback(() =>
    fetch(`${api}/integrations/google-cloud`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail || "Connection check failed");
        return r.json();
      })
      .then((data) => {
        setConnection(data);
        setProject(String(data.project || ""));
      })
      .catch((e) => setError(e.message)),
  []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  async function verify() {
    setVerifying(true);
    setError("");
    try {
      const configure = await fetch(`${api}/integrations/google-cloud`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_project_id: project }),
      });
      const configured = await configure.json();
      if (!configure.ok) throw new Error(configured.detail || "Project configuration failed");

      const response = await fetch(`${api}/integrations/google-cloud/verify`, { method: "POST" });
      const queued = await response.json();
      if (!response.ok) throw new Error(queued.detail || "Verification could not start");

      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const jobResponse = await fetch(`${api}/jobs/${queued.job_id}`, { cache: "no-store" });
        const job = await jobResponse.json();
        if (job.status === "SUCCEEDED") {
          await load();
          show("Google Cloud connection verified successfully", "success");
          return;
        }
        if (job.status === "FAILED") throw new Error(job.error || "Google Cloud verification failed");
      }
      throw new Error("Verification is still running. Check Reviews shortly.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      setError(msg);
      show(msg, "error");
    } finally {
      setVerifying(false);
    }
  }

  const scannerPrincipal = String(connection?.scanner_principal || "");
  const iamCommand = project && scannerPrincipal
    ? `gcloud projects add-iam-policy-binding ${project} --member="serviceAccount:${scannerPrincipal}" --role="roles/viewer"`
    : "";

  return (
    <main className="page section-page">
      <Heading title="Integrations" description="Connected systems TrustFix can inspect and verify." />
      {!connection ? (
        error ? <Failure message={error} retry={load} /> : <Loading />
      ) : (
        <div className="integration-grid">
          <article className="featured">
            <Cloud size={28} />
            <div>
              <h3>Google Cloud</h3>
              <p>Live infrastructure inspection and governed remediation.</p>
            </div>
            <span className={`status ${connection.status === "VERIFIED" ? "verified" : connection.status === "VERIFICATION_REQUIRED" ? "needs-review" : "failed"}`}>
              {connection.status === "VERIFIED" ? "Verified" : connection.status === "VERIFICATION_REQUIRED" ? "Verification required" : "Not configured"}
            </span>
            <dl>
              <div><dt>Project</dt><dd>{String(connection.project || "—")}</dd></div>
              <div><dt>Boundary</dt><dd>{String(connection.boundary)}</dd></div>
              <div><dt>Authentication</dt><dd>{String(connection.authentication)}</dd></div>
              <div><dt>Region</dt><dd>{String(connection.region)}</dd></div>
              <div><dt>Live evidence</dt><dd>{String(connection.evidence_count)} items</dd></div>
              <div>
                <dt>Last verified</dt>
                <dd>
                  {connection.last_verified
                    ? new Date(String(connection.last_verified)).toLocaleString()
                    : "Run verification"}
                </dd>
              </div>
            </dl>
            <div className="connection-explainer">
              <strong>How this connection works</strong>
              <p>Saving a project ID only selects the inspection boundary. TrustFix becomes operational after its dedicated scanner service account successfully reads that exact project. Your Google login authenticates this workspace; it does not grant cloud access.</p>
              <ol><li><span>1</span>Enter the exact Google Cloud project ID</li><li><span>2</span>Grant the displayed scanner identity read access</li><li><span>3</span>Verify and collect fresh project-scoped evidence</li></ol>
            </div>
            <label className="connection-editor">
              Workspace target project
              <input
                value={project}
                onChange={(e) => setProject(e.target.value.toLowerCase().trim())}
                pattern="[a-z][a-z0-9-]{4,28}[a-z0-9]"
                placeholder="acme-production-security"
                aria-label="Workspace target project"
              />
            </label>
            {project && <div className="connection-iam-guide"><div><strong>1. Grant scanner access in the target project</strong><span>Run as a Project Owner or IAM administrator. This grants read-only Viewer access to the dedicated keyless scanner.</span></div><div className="cloud-command"><header><span>Google Cloud Shell</span><button type="button" onClick={async () => { await navigator.clipboard.writeText(iamCommand); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}>{copied ? <Check/> : <Copy/>}{copied ? "Copied" : "Copy command"}</button></header><code>{iamCommand}</code></div><a className="button secondary" href={`https://console.cloud.google.com/iam-admin/iam?project=${encodeURIComponent(project)}`} target="_blank" rel="noreferrer">Open project IAM <ArrowSquareOut/></a><div><strong>2. Verify live API access</strong><span>TrustFix tests Storage, Cloud Run, and Firewall visibility before marking this project verified.</span></div></div>}
            <button
              className="button primary"
              onClick={verify}
              disabled={verifying || !project}
            >
              {verifying ? "Testing scanner access…" : connection.status === "VERIFIED" && project === connection.project ? "Reverify connection" : "Save and verify access"}
            </button>
            {error && <p className="form-error" role="alert">{error}</p>}
          </article>
          {["Google Drive", "Gmail", "Slack"].map((name) => (
            <article key={name}>
              <HardDrives />
              <div>
                <h3>{name}</h3>
                <p>Optional questionnaire source.</p>
              </div>
              <span className="status neutral">Roadmap</span>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Page
// ─────────────────────────────────────────────────────────────────────────────
type TeamData = {
  members: Array<{ id: string; email: string; display_name: string; role: string; status: string }>;
  invitations: Array<{ id: string; email: string; role: string; status: string }>;
};

export function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Security Reviewer");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { show } = useToast();

  const load = useCallback(() =>
    fetch(`${api}/team`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail || "Team could not load");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message)),
  []);

  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${api}/team/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Invitation failed");
      setEmail("");
      await load();
      show(`Access record created for ${email}`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invitation failed";
      setError(msg);
      show(msg, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page section-page">
      <Heading title="Team" description="Workspace access and security-review roles." />
      {!data ? (
        error ? <Failure message={error} retry={load} /> : <Loading />
      ) : (
        <>
          <div className="data-panel">
            <div className="data-head">
              <strong>Workspace members</strong>
              <span className="status verified">{data.members.length} active</span>
            </div>
            {data.members.map((member) => (
              <div className="data-row" key={member.id}>
                <span className="control-icon"><CheckCircle /></span>
                <div>
                  <strong>{member.display_name}</strong>
                  <p>{member.email}</p>
                </div>
                <span>{member.role}</span>
                <span className="status verified">{member.status}</span>
              </div>
            ))}
            {data.invitations.map((inv) => (
              <div className="data-row" key={inv.id}>
                <span className="control-icon"><UserPlus /></span>
                <div>
                  <strong>{inv.email}</strong>
                  <p>{inv.role}</p>
                </div>
                <span className="status needs-review">{inv.status}</span>
              </div>
            ))}
            {data.members.length === 0 && data.invitations.length === 0 && (
              <div className="empty-state">
                <Info size={28} />
                <h2>No team members yet</h2>
                <p>Invite security reviewers using the form below.</p>
              </div>
            )}
          </div>
          <form className="invite-panel" onSubmit={invite}>
            <div>
              <h2>Invite team member</h2>
              <p>Create the workspace role record, then grant the same email IAP access in Google Cloud. TrustFix does not send an email invitation yet.</p>
            </div>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="reviewer@company.com"
              />
            </label>
            <label>
              Role
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option>Security Reviewer</option>
                <option>Admin</option>
                <option>Viewer</option>
              </select>
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Create access record"}
            </button>
            {error && <p className="form-error" role="alert">{error}</p>}
          </form>
        </>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System Page
// ─────────────────────────────────────────────────────────────────────────────
export function SystemPage() {
  const [data, setData] = useState<Json | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() =>
    fetch(`${api}/system`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("System status unavailable");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message)),
  []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  return (
    <main className="page section-page">
      <Heading title="System" description="Deployment state and production readiness signals." />
      {!data ? (
        error ? <Failure message={error} retry={load} /> : <Loading />
      ) : (
        <div className="system-grid">
          {Object.entries(data).map(([key, value]) => (
            <article key={key}>
              <span>{key.replaceAll("_", " ")}</span>
              <strong>{String(value)}</strong>
              <CheckCircle weight="fill" color="var(--green)" />
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Evidence / Activity / Findings Page
// ─────────────────────────────────────────────────────────────────────────────
export function EvidencePage({ kind }: { kind: "evidence" | "activity" | "findings" }) {
  const [items, setItems] = useState<Array<Json> | null>(null);
  const [error, setError] = useState("");

  const endpoint = kind === "findings" ? "remediations" : kind;
  const load = useCallback(() =>
    fetch(`${api}/${endpoint}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Could not load ${kind}`);
        return r.json();
      })
      .then(setItems)
      .catch((e) => setError(e.message)),
  [kind, endpoint]);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  const title = kind === "findings" ? "Findings" : kind[0].toUpperCase() + kind.slice(1);
  const description =
    kind === "evidence" ? "Resource-specific proof collected during control checks." :
    kind === "activity" ? "Append-oriented history of review and remediation decisions." :
    "Security gaps that need remediation or manual review.";

  if (kind === "activity") {
    return (
      <main className="page section-page">
        <Heading title={title} description={description} />
        {!items ? (
          error ? <Failure message={error} retry={load} /> : <Loading />
        ) : (
          <div className="data-panel">
            <div className="data-head">
              <strong>{items.length} events</strong>
              <span className="status verified">Live data</span>
            </div>
            {items.length === 0 ? (
              <div className="empty-state">
                <Pulse size={28} />
                <h2>No activity yet</h2>
                <p>Run a live review to generate workspace activity.</p>
              </div>
            ) : (
              <div className="activity-panel">
                {items.map((item, i) => {
                  const action = String(item.action || "");
                  const isFail = action.toLowerCase().includes("fail");
                  const isSuccess = action.toLowerCase().includes("verif") || action.toLowerCase().includes("complet");
                  const dotClass = isFail ? "fail" : isSuccess ? "success" : "normal";
                  return (
                    <div className="event" key={String(item.id || i)}>
                      <span className={`event-dot ${dotClass}`} />
                      <div>
                        <strong>{action}</strong>
                        <p>{String(item.resource || item.result || "")}</p>
                      </div>
                      <time dateTime={String(item.timestamp || "")}>
                        {item.timestamp ? relativeTime(String(item.timestamp)) : ""}
                      </time>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="page section-page">
      <Heading title={title} description={description} />
      {!items ? (
        error ? <Failure message={error} retry={load} /> : <Loading />
      ) : (
        <div className="data-panel">
          <div className="data-head">
            <strong>{items.length} records</strong>
            <span className="status verified">Live data</span>
          </div>
          {items.length === 0 ? (
            <div className="empty-state">
              <Info size={28} />
              <h2>No records yet</h2>
              <p>Run a live review to create workspace {kind}.</p>
            </div>
          ) : (
            items.map((item, i) => {
              const isFinding = kind === "findings";
              const Icon = isFinding ? ShieldWarning : HardDrives;
              const iconClass = isFinding ? "finding-icon critical" : "evidence-source";
              const ts = String(item.collected_at || item.created_at || item.timestamp || "");
              return (
                <div className="data-row" key={String(item.id || i)}>
                  <span className={iconClass}><Icon /></span>
                  <div>
                    <strong>
                      {String(item.control_id || item.source || item.action || "TrustFix record")}
                    </strong>
                    <p>{String(item.resource || item.resource_identifier || item.result || "")}</p>
                  </div>
                  <p>{String(item.observation || item.proposed_change || item.result || "")}</p>
                  <span>{ts ? relativeTime(ts) : ""}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Controls Page (live)
// ─────────────────────────────────────────────────────────────────────────────
export function ControlsPage() {
  const [controls, setControls] = useState<Array<Json> | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() =>
    fetch(`${api}/controls`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("Could not load controls");
        return r.json();
      })
      .then(setControls)
      .catch((e) => setError(e.message)),
  []);

  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load);

  const statusClass = (s: string) =>
    s === "VERIFIED" ? "verified" : s === "FAILED" ? "failed" : "needs-review";
  const statusLabel = (s: string) =>
    s === "VERIFIED" ? "Verified" : s === "FAILED" ? "Failed" : "Not yet run";

  return (
    <main className="page section-page">
      <Heading
        title="Control library"
        description="Deterministic checks currently supported for Google Cloud."
      />
      {!controls ? (
        error ? <Failure message={error} retry={load} /> : <Loading />
      ) : (
        <div className="cards-list">
          {controls.map((control) => (
            <article key={String(control.id)}>
              <span className="control-icon"><LockKey /></span>
              <div>
                <h3>{String(control.name)}</h3>
                <code>{String(control.id)}</code>
                <p>{String(control.description)}</p>
              </div>
              <span className={`status ${statusClass(String(control.last_status || ""))}`}>
                {statusLabel(String(control.last_status || ""))}
              </span>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Policies Page
// ─────────────────────────────────────────────────────────────────────────────
export function PoliciesPage() {
  const [data, setData] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { show } = useToast();

  const load = useCallback(() =>
    fetch(`${api}/policies`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message)),
  []);

  useEffect(() => { load(); }, [load]);

  const controlDefs = [
    ["storage", "Public storage remediation", true, "Approved execution is enabled for explicitly named disposable TrustFix buckets."],
    ["cloud_run", "Cloud Run access remediation", false, "Inspection is live; mutation remains manual until rollback acceptance is complete."],
    ["firewall", "Firewall remediation", false, "Inspection is live; mutation remains manual until rollback acceptance is complete."],
  ] as const;

  async function save() {
    if (!data) return;
    setSaving(true);
    setError("");
    try {
      const payload = Object.fromEntries(controlDefs.map(([key]) => [key, data[key]]));
      const response = await fetch(`${api}/policies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Could not save policies");
      setData(body); // Update with server response
      show("Policies saved successfully", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save policies";
      setError(msg);
      show(msg, "error");
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <main className="page section-page">
        <Heading title="Policies" description="Deterministic approval boundaries for infrastructure changes." />
        {error ? <Failure message={error} retry={load} /> : <Loading />}
      </main>
    );
  }

  return (
    <main className="page section-page">
      <Heading title="Policies" description="Deterministic approval boundaries for infrastructure changes." />
      <div className="data-panel policy-list">
        {controlDefs.map(([key, label, executable, detail]) => (
          <div className="data-row" key={key}>
            <span className="control-icon"><LockKey /></span>
            <div>
              <strong>{label}</strong>
              <p>{detail}</p>
            </div>
            <select
              value={data[key] || "REQUIRE_APPROVAL"}
              onChange={(e) => setData({ ...data, [key]: e.target.value })}
              aria-label={`${label} policy`}
              disabled={!executable}
            >
              {executable && <option value="REQUIRE_APPROVAL">Require approval</option>}
              <option value="MANUAL_ONLY">Manual only</option>
            </select>
          </div>
        ))}
      </div>
      <div className="save-row">
        <button className="button primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save policies"}
        </button>
        {error && <span style={{ color: "var(--red)", fontSize: 11 }}>{error}</span>}
      </div>
    </main>
  );
}
