"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, Cloud, HardDrives, Info, LockKey, UserPlus, Warning } from "@phosphor-icons/react";

const api = "/api/trustfix/api";
type Json = Record<string, unknown>;

function Heading({ title, description }: { title: string; description: string }) {
  return <div className="page-heading"><div><span className="breadcrumb">TRUSTFIX / {title.toUpperCase()}</span><h1>{title}</h1><p>{description}</p></div></div>;
}

function Loading() { return <div className="empty-state"><Info size={28}/><h2>Loading live workspace data</h2><p>Reading the signed-in workspace from TrustFix.</p></div>; }
function Failure({ message }: { message: string }) { return <div className="empty-state"><Warning size={28}/><h2>Could not load this page</h2><p>{message}</p></div>; }

export function IntegrationsPage() {
  const [connection, setConnection] = useState<Json | null>(null);
  const [project, setProject] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const load = useCallback(() => fetch(`${api}/integrations/google-cloud`, { cache: "no-store" }).then(async r => { if (!r.ok) throw new Error((await r.json()).detail || "Connection check failed"); return r.json(); }).then(data => { setConnection(data); setProject(String(data.project || "")); }).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  async function verify() {
    setVerifying(true); setError("");
    try {
      const configure = await fetch(`${api}/integrations/google-cloud`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_project_id: project }) });
      const configured = await configure.json(); if (!configure.ok) throw new Error(configured.detail || "Project configuration failed");
      const response = await fetch(`${api}/integrations/google-cloud/verify`, { method: "POST" });
      const queued = await response.json(); if (!response.ok) throw new Error(queued.detail || "Verification could not start");
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const jobResponse = await fetch(`${api}/jobs/${queued.job_id}`, { cache: "no-store" });
        const job = await jobResponse.json();
        if (job.status === "SUCCEEDED") { await load(); return; }
        if (job.status === "FAILED") throw new Error(job.error || "Google Cloud verification failed");
      }
      throw new Error("Verification is still running. Check Reviews shortly.");
    } catch (e) { setError(e instanceof Error ? e.message : "Verification failed"); }
    finally { setVerifying(false); }
  }
  return <main className="page section-page"><Heading title="Integrations" description="Connected systems TrustFix can inspect and verify."/>{!connection ? (error ? <Failure message={error}/> : <Loading/>) : <div className="integration-grid"><article className="featured"><Cloud size={28}/><div><h3>Google Cloud</h3><p>Live infrastructure inspection and governed remediation.</p></div><span className={`status ${connection.status === "CONNECTED" ? "verified" : "failed"}`}>{connection.status === "CONNECTED" ? "Connected" : "Not configured"}</span><dl><div><dt>Project</dt><dd>{String(connection.project || "—")}</dd></div><div><dt>Boundary</dt><dd>{String(connection.boundary)}</dd></div><div><dt>Authentication</dt><dd>{String(connection.authentication)}</dd></div><div><dt>Region</dt><dd>{String(connection.region)}</dd></div><div><dt>Live evidence</dt><dd>{String(connection.evidence_count)} items</dd></div><div><dt>Last verified</dt><dd>{connection.last_verified ? new Date(String(connection.last_verified)).toLocaleString() : "Run verification"}</dd></div></dl><label className="connection-editor">Workspace target project<input value={project} onChange={event => setProject(event.target.value.toLowerCase().trim())} pattern="[a-z0-9-]+" aria-label="Workspace target project"/></label><button className="button primary" onClick={verify} disabled={verifying || !project}>{verifying ? "Saving and verifying…" : "Save & verify project"}</button>{error && <p className="form-error">{error}</p>}</article>{["Google Drive", "Gmail", "Slack"].map(name => <article key={name}><HardDrives/><div><h3>{name}</h3><p>Optional questionnaire source.</p></div><span className="status neutral">Roadmap</span></article>)}</div>}</main>;
}

type TeamData = { members: Array<{ id: string; email: string; display_name: string; role: string; status: string }>; invitations: Array<{ id: string; email: string; role: string; status: string }> };
export function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null); const [email, setEmail] = useState(""); const [role, setRole] = useState("Security Reviewer"); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const load = useCallback(() => fetch(`${api}/team`, { cache: "no-store" }).then(async r => { if (!r.ok) throw new Error((await r.json()).detail || "Team could not load"); return r.json(); }).then(setData).catch(e => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);
  async function invite(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError(""); try { const response = await fetch(`${api}/team/invitations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) }); const body = await response.json(); if (!response.ok) throw new Error(body.detail || "Invitation failed"); setEmail(""); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Invitation failed"); } finally { setBusy(false); } }
  return <main className="page section-page"><Heading title="Team" description="Workspace access and security-review roles."/>{!data ? (error ? <Failure message={error}/> : <Loading/>) : <><div className="data-panel"><div className="data-head"><strong>Workspace members</strong><span className="status verified">{data.members.length} active</span></div>{data.members.map(member => <div className="data-row" key={member.id}><span className="control-icon"><CheckCircle/></span><div><strong>{member.display_name}</strong><p>{member.email}</p></div><span>{member.role}</span><span className="status verified">{member.status}</span></div>)}{data.invitations.map(invite => <div className="data-row" key={invite.id}><span className="control-icon"><UserPlus/></span><div><strong>{invite.email}</strong><p>{invite.role}</p></div><span className="status needs-review">{invite.status}</span></div>)}</div><form className="invite-panel" onSubmit={invite}><div><h2>Invite team member</h2><p>The user joins this workspace after the platform administrator grants IAP access and they sign in.</p></div><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="reviewer@company.com"/></label><label>Role<select value={role} onChange={e => setRole(e.target.value)}><option>Security Reviewer</option><option>Admin</option><option>Viewer</option></select></label><button className="button primary" disabled={busy}>{busy ? "Saving…" : "Create invitation"}</button>{error && <p className="form-error">{error}</p>}</form></>}</main>;
}

export function SystemPage() {
  const [data, setData] = useState<Json | null>(null); const [error, setError] = useState("");
  useEffect(() => { fetch(`${api}/system`, { cache: "no-store" }).then(async r => { if (!r.ok) throw new Error("System status unavailable"); return r.json(); }).then(setData).catch(e => setError(e.message)); }, []);
  return <main className="page section-page"><Heading title="System" description="Deployment state and production readiness signals."/>{!data ? (error ? <Failure message={error}/> : <Loading/>) : <div className="system-grid">{Object.entries(data).map(([key,value]) => <article key={key}><span>{key.replaceAll("_", " ")}</span><strong>{String(value)}</strong><CheckCircle weight="fill"/></article>)}</div>}</main>;
}

export function EvidencePage({ kind }: { kind: "evidence" | "activity" | "findings" }) {
  const [items, setItems] = useState<Array<Json> | null>(null); const [error, setError] = useState("");
  useEffect(() => { fetch(`${api}/${kind === "findings" ? "remediations" : kind}`, { cache: "no-store" }).then(async r => { if (!r.ok) throw new Error(`Could not load ${kind}`); return r.json(); }).then(setItems).catch(e => setError(e.message)); }, [kind]);
  const title = kind[0].toUpperCase() + kind.slice(1);
  return <main className="page section-page"><Heading title={title} description="Live, workspace-scoped security review records."/>{!items ? (error ? <Failure message={error}/> : <Loading/>) : <div className="data-panel"><div className="data-head"><strong>{items.length} records</strong><span className="status verified">Live data</span></div>{items.length === 0 ? <div className="empty-state"><Info size={28}/><h2>No records yet</h2><p>Run a live review to create workspace evidence.</p></div> : items.map((item, index) => <div className="data-row" key={String(item.id || index)}><span className="evidence-source">{kind === "findings" ? <Warning/> : <HardDrives/>}</span><div><strong>{String(item.control_id || item.action || item.source || "TrustFix record")}</strong><p>{String(item.resource || item.resource_identifier || item.result || "")}</p></div><p>{String(item.observation || item.proposed_change || item.result || "")}</p><span>{item.collected_at || item.created_at || item.timestamp ? new Date(String(item.collected_at || item.created_at || item.timestamp)).toLocaleString() : ""}</span></div>)}</div>}</main>;
}

export function PoliciesPage() {
  const [data, setData] = useState<Record<string,string> | null>(null); const [message, setMessage] = useState("");
  useEffect(() => { fetch(`${api}/policies`, { cache: "no-store" }).then(r => r.json()).then(setData); }, []);
  if (!data) return <main className="page section-page"><Heading title="Policies" description="Deterministic approval boundaries for infrastructure changes."/><Loading/></main>;
  const current = data;
  const controls = [["storage","Public storage remediation"],["cloud_run","Cloud Run access remediation"],["firewall","Firewall remediation"]];
  async function save() { const payload = Object.fromEntries(controls.map(([key]) => [key, current[key]])); const response = await fetch(`${api}/policies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }); setMessage(response.ok ? "Policies saved" : "Could not save policies"); }
  return <main className="page section-page"><Heading title="Policies" description="Deterministic approval boundaries for infrastructure changes."/><div className="data-panel policy-list">{controls.map(([key,label]) => <div className="data-row" key={key}><span className="control-icon"><LockKey/></span><div><strong>{label}</strong><p>Applied to this signed-in workspace.</p></div><select value={data[key]} onChange={e => setData({...data,[key]:e.target.value})} aria-label={`${label} policy`}><option value="AUTO_REMEDIATE">Auto remediate</option><option value="REQUIRE_APPROVAL">Require approval</option><option value="MANUAL_ONLY">Manual only</option></select></div>)}</div><div className="save-row"><button className="button primary" onClick={save}>Save policies</button>{message && <span>{message}</span>}</div></main>;
}
