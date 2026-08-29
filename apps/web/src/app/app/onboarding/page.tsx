"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowSquareOut, Check, CheckCircle, CloudCheck, Copy, Key, LockKey, ShieldCheck } from "@phosphor-icons/react";
import { Mark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const api = "/api/trustfix/api";
type Setup = { organization_name?: string; primary_use_case?: string; target_boundary_confirmed: boolean; onboarding_complete: boolean; target_project?: string; platform_project?: string; connection_ready: boolean; connection_status?: string; last_verified?: string; scanner_principal?: string };

async function json(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("Your authenticated workspace session moved. Reload this page and try again.");
  return response.json();
}

export default function OnboardingPage() {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [organization, setOrganization] = useState("");
  const [useCase, setUseCase] = useState("Customer security reviews");
  const [targetProject, setTargetProject] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const host = window.location.hostname;
    if (host.startsWith("trustfix-app-") || host.startsWith("trustfix-web-")) {
      window.location.replace(window.location.href.replace(/^https:\/\/trustfix-(?:app|web)-/, "https://trustfix-workspace-"));
      return;
    }
    fetch(`${api}/onboarding`, { cache: "no-store" })
      .then(async response => { const data = await json(response); if (!response.ok) throw new Error(data.detail || "Workspace setup could not be loaded"); return data; })
      .then(data => {
        const savedUseCase = ["Hackathon demonstration", "Cloud security assurance"].includes(data.primary_use_case) ? "Continuous cloud assurance" : data.primary_use_case;
        setSetup(data); setOrganization(data.organization_name || ""); setUseCase(savedUseCase || "Customer security reviews"); setTargetProject(data.target_project || ""); setConfirmed(data.target_boundary_confirmed); setVerified(Boolean(data.connection_ready));
        if (data.onboarding_complete) router.replace("/app");
      })
      .catch(errorValue => setError(errorValue instanceof Error ? errorValue.message : "Workspace setup could not be loaded."));
  }, [router]);

  const iamCommand = useMemo(() => targetProject && setup?.scanner_principal
    ? `gcloud projects add-iam-policy-binding ${targetProject} --member="serviceAccount:${setup.scanner_principal}" --role="roles/viewer"`
    : "", [targetProject, setup?.scanner_principal]);
  const cloudShellUrl = `https://console.cloud.google.com/cloudshell/editor?project=${encodeURIComponent(targetProject)}`;
  const iamConsoleUrl = `https://console.cloud.google.com/iam-admin/iam?project=${encodeURIComponent(targetProject)}`;

  async function copyCommand() {
    if (!iamCommand) return;
    await navigator.clipboard.writeText(iamCommand); setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  async function verify() {
    setVerifying(true); setError("");
    try {
      const configureResponse = await fetch(`${api}/integrations/google-cloud`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_project_id: targetProject }) });
      const configured = await json(configureResponse);
      if (!configureResponse.ok) throw new Error(configured.detail || "Project configuration failed");
      const response = await fetch(`${api}/integrations/google-cloud/verify`, { method: "POST" });
      const queued = await json(response);
      if (!response.ok) throw new Error(queued.detail || "Verification could not start");
      for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const jobResponse = await fetch(`${api}/jobs/${queued.job_id}`, { cache: "no-store" });
        const job = await json(jobResponse);
        if (job.status === "SUCCEEDED") { setVerified(true); return; }
        if (job.status === "FAILED") throw new Error(`${job.error || "Verification failed"}. Confirm the project ID and IAM grant, then retry.`);
      }
      throw new Error("Verification is still running. Try again shortly.");
    } catch (errorValue) { setError(errorValue instanceof Error ? errorValue.message : "Verification failed"); }
    finally { setVerifying(false); }
  }

  async function finish(event: React.FormEvent) {
    event.preventDefault(); setError("");
    try {
      const response = await fetch(`${api}/onboarding`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organization_name: organization, primary_use_case: useCase, target_project_id: targetProject, target_boundary_confirmed: confirmed }) });
      const body = await json(response);
      if (!response.ok) throw new Error(body.detail || "Onboarding could not be completed");
      window.sessionStorage.setItem("trustfix:onboarding-complete", "true"); window.location.assign("/app");
    } catch (errorValue) { setError(errorValue instanceof Error ? errorValue.message : "Onboarding could not be completed"); }
  }

  if (!setup) return <main className="onboarding"><div className="onboarding-card"><Mark/><p>{error || "Loading your protected workspace…"}</p></div></main>;

  return <main className="onboarding"><div className="onboarding-card onboarding-card-wide">
    <header><Mark/><div className="onboarding-header-actions"><ThemeToggle compact/><span className="status verified">Protected by Google IAP</span></div></header>
    <div className="onboarding-intro"><span className="section-index">WORKSPACE SETUP</span><h1>Connect TrustFix to your Google Cloud environment.</h1><p>Configure a real, project-scoped inspection boundary. TrustFix uses a dedicated keyless scanner identity—never your personal credentials.</p></div>
    <div className="onboarding-stepper" aria-label="Setup progress">
      <div className={`step-pill ${organization.length >= 2 ? "done" : "active"}`}>
        <span>01</span> Workspace
      </div>
      <div className={`step-pill ${targetProject ? "done" : organization.length >= 2 ? "active" : ""}`}>
        <span>02</span> Target Project
      </div>
      <div className={`step-pill ${confirmed ? "done" : targetProject ? "active" : ""}`}>
        <span>03</span> Scanner IAM
      </div>
      <div className={`step-pill ${verified ? "done" : confirmed ? "active" : ""}`}>
        <span>04</span> Verification
      </div>
    </div>
    <form onSubmit={finish}>
      <section className="onboarding-step"><span className="step-number">01</span><div><h2>Create your TrustFix workspace</h2><p>Personalize the workspace, reports, evidence exports, and security-review records.</p><label>Organization name<input value={organization} onChange={event => setOrganization(event.target.value)} required minLength={2} placeholder="Acme Security"/></label></div></section>
      <section className="onboarding-step"><span className="step-number">02</span><div><h2>Select the Google Cloud project</h2><p>Use the immutable <strong>Project ID</strong> from Google Cloud—not the project display name or project number. TrustFix stores this as the exact evidence and authorization boundary.</p><label>Google Cloud project ID<input value={targetProject} onChange={event => { setTargetProject(event.target.value.toLowerCase().trim()); setVerified(false); setError(""); }} required pattern="[a-z][a-z0-9-]{4,28}[a-z0-9]" placeholder="acme-production-security"/><small>Find it in Google Cloud Console → project selector → ID column.</small></label><div className="project-boundary"><div><span>TrustFix platform</span><code>{setup.platform_project}</code></div><div><span>Your inspection target</span><code>{targetProject || "Enter a project ID"}</code></div><div><span>Supported inspection</span><strong>Storage IAM · Cloud Run IAM · Firewall rules</strong></div></div></div></section>
      <section className="onboarding-step"><span className="step-number">03</span><div><h2>Authorize the TrustFix scanner</h2><p>Run this once as a Project Owner or IAM administrator. It grants the dedicated scanner read-only visibility into the selected project. It does not grant write access and does not store a key.</p><div className="identity-card"><Key/><div><span>SCANNER SERVICE ACCOUNT</span><code>{setup.scanner_principal}</code></div><span className="status neutral">Keyless</span></div><div className="cloud-command"><header><span>Run in Google Cloud Shell</span><button type="button" onClick={copyCommand} disabled={!iamCommand}>{copied ? <Check/> : <Copy/>}{copied ? "Copied" : "Copy command"}</button></header><code>{iamCommand || "Enter a project ID to generate the IAM command."}</code></div><div className="setup-actions"><a className="button secondary" href={cloudShellUrl} target="_blank" rel="noreferrer">Open Cloud Shell <ArrowSquareOut/></a><a className="button secondary" href={iamConsoleUrl} target="_blank" rel="noreferrer">Review project IAM <ArrowSquareOut/></a></div><label className="check-label"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)}/><span><strong>I understand and approve this inspection boundary.</strong><small>TrustFix receives project Viewer access for evidence collection. Any future remediation requires a separate approval and separately scoped permission.</small></span></label></div></section>
      <section className="onboarding-step"><span className="step-number">04</span><div><h2>Test access and collect first evidence</h2><p>Verification calls the live Google Cloud APIs using the scanner identity. The workspace unlocks only if the exact project can be inspected successfully.</p><div className={`connection-check ${verified ? "connection-verified" : ""}`}><CloudCheck size={24}/><div><strong>{verified ? `${targetProject} is verified` : targetProject ? `Ready to test ${targetProject}` : "Enter a project ID first"}</strong><small>{verified ? "Fresh project-scoped evidence was collected successfully." : "Complete the IAM step above, then test the connection."}</small></div>{verified ? <span className="status verified"><CheckCircle/> Verified</span> : <button type="button" className="button primary" onClick={verify} disabled={verifying || !targetProject || !confirmed}>{verifying ? "Testing APIs…" : "Test connection"}</button>}</div>{error && <p className="form-error" role="alert">{error}</p>}</div></section>
      <section className="onboarding-next"><span className="section-index">AFTER CONNECTION</span><h2>What TrustFix enables next</h2><div><article><CheckCircle/><strong>Run assurance</strong><p>Map review questions to deterministic controls and inspect live resources.</p></article><article><ShieldCheck/><strong>Govern findings</strong><p>Review exact evidence, proposed changes, risk, dependencies, and rollback.</p></article><article><LockKey/><strong>Export proof</strong><p>Produce project-scoped Proof Packs with evidence lineage and approvals.</p></article></div></section>
      <footer><span>Project access can be changed and reverified later from Integrations.</span><button className="button primary" disabled={!verified || !confirmed || organization.length < 2 || !targetProject}>Finish setup and open workspace</button></footer>
    </form>
  </div></main>;
}
