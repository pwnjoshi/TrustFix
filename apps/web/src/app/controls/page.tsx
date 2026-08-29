import Link from "next/link";
import {
  ArrowRight, CheckCircle, Cloud, Code, Fingerprint,
  HardDrives, LockKey, ShieldCheck, ShieldWarning, Warning
} from "@phosphor-icons/react/dist/ssr";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const supportedControls = [
  {
    id: "GCP_STORAGE_PUBLIC_ACCESS",
    title: "Storage IAM Public Access Prevention",
    service: "Google Cloud Storage",
    category: "Data Security & Access Control",
    severity: "HIGH",
    description: "Ensures no Cloud Storage bucket grants public or anonymous read/write roles (roles/storage.objectViewer, roles/storage.admin) to allUsers or allAuthenticatedUsers.",
    evidenceCollected: "Bucket IAM policy bindings, Uniform Bucket-Level Access (UBLA) status, Public Access Prevention (PAP) setting.",
    remediationAction: "Surgically removes only the public IAM binding while preserving all team and service account bindings. Captures pre-change rollback fingerprint.",
    independentProbe: "Executes unauthenticated external HTTP GET against the bucket endpoint and confirms HTTP 403 Forbidden."
  },
  {
    id: "GCP_RUN_PUBLIC_INVOKER",
    title: "Cloud Run Unauthenticated Invocation Gating",
    service: "Cloud Run",
    category: "Application & Service Security",
    severity: "CRITICAL",
    description: "Guarantees internal services and private microservices do not grant roles/run.invoker to anonymous callers without Google IAP or IAM token verification.",
    evidenceCollected: "Service IAM policy, ingress traffic settings (all vs internal vs internal-and-cloud-load-balancing), authentication requirement state.",
    remediationAction: "Removes unauthenticated invoker permissions and enforces authenticated service-to-service IAM.",
    independentProbe: "Attempts anonymous HTTP POST/GET to the Cloud Run service URL and verifies HTTP 401/403 rejection."
  },
  {
    id: "GCP_FIREWALL_ADMIN_EXPOSURE",
    title: "VPC Ingress Administrative Port Lockdown",
    service: "Compute Engine & VPC Firewall",
    category: "Network Perimeter Security",
    severity: "HIGH",
    description: "Verifies that ingress firewall rules do not expose sensitive administrative ports (SSH 22, RDP 3389, Database ports) to the open internet (0.0.0.0/0).",
    evidenceCollected: "VPC Firewall rules, source IP ranges, allowed protocols/ports, rule priority, disabled state.",
    remediationAction: "Restricts source IP range to trusted internal VPC CIDRs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) or Identity-Aware Proxy CIDR (35.235.240.0/20).",
    independentProbe: "Validates firewall rule evaluation engine confirms no internet-facing allow paths."
  },
  {
    id: "GCP_IAM_LEAST_PRIVILEGE",
    title: "Keyless IAM & Principle of Least Privilege",
    service: "Cloud IAM & Resource Manager",
    category: "Identity & Access Governance",
    severity: "MEDIUM",
    description: "Validates that scanning and remediation workloads use dedicated, project-scoped service identities without permanent exported service account keys.",
    evidenceCollected: "Project IAM policy, service account keys audit, OAuth scope constraints.",
    remediationAction: "Disables key export, enforces Google Cloud Workload Identity Federation / Keyless SA tokens.",
    independentProbe: "Inspects Cloud Audit Logs for keyless token exchange."
  }
];

export default function ControlsPage() {
  return (
    <main className="marketing-page">
      <MarketingHeader />

      <section className="inner-hero">
        <span className="section-index">CONTROLS CATALOG</span>
        <h1>Deterministic Google Cloud security controls.</h1>
        <p>
          TrustFix evaluates questionnaire requirements against verifiable, code-backed Google Cloud control definitions.
          Zero hallucinated answers—every control is inspected live and proved with evidence.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="/app">
            Launch live workspace <ArrowRight size={14} />
          </a>
          <Link className="button secondary" href="/security">
            Security & Boundaries
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: "1120px", margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "28px" }}>
          {supportedControls.map((ctrl) => (
            <article
              key={ctrl.id}
              style={{
                background: "var(--tf-surface)",
                border: "1px solid var(--tf-line)",
                borderRadius: "14px",
                padding: "32px",
                boxShadow: "var(--tf-shadow-md)",
                transition: "border-color 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
                <div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--tf-verified)", letterSpacing: "0.06em", fontWeight: 700 }}>
                    {ctrl.id} · {ctrl.service.toUpperCase()}
                  </span>
                  <h2 style={{ fontSize: "22px", margin: "6px 0 4px", letterSpacing: "-0.02em" }}>{ctrl.title}</h2>
                  <span style={{ fontSize: "12px", color: "var(--tf-ink-muted)" }}>Category: {ctrl.category}</span>
                </div>
                <span className={`status ${ctrl.severity === "CRITICAL" ? "failed" : "neutral"}`}>
                  {ctrl.severity} SEVERITY
                </span>
              </div>

              <p style={{ fontSize: "15px", lineHeight: "1.6", color: "var(--tf-ink-secondary)", marginBottom: "24px" }}>
                {ctrl.description}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px", borderTop: "1px solid var(--tf-line-subtle)", paddingTop: "20px" }}>
                <div style={{ background: "var(--tf-surface-sunken)", padding: "16px 18px", borderRadius: "8px", border: "1px solid var(--tf-line-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: "var(--tf-ink-secondary)", fontSize: "11px", fontWeight: 700 }}>
                    <Fingerprint size={16} color="var(--tf-verified)" /> EVIDENCE COLLECTED
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--tf-ink-muted)", margin: 0, lineHeight: "1.5" }}>
                    {ctrl.evidenceCollected}
                  </p>
                </div>

                <div style={{ background: "var(--tf-surface-sunken)", padding: "16px 18px", borderRadius: "8px", border: "1px solid var(--tf-line-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: "var(--tf-ink-secondary)", fontSize: "11px", fontWeight: 700 }}>
                    <ShieldCheck size={16} color="#60a5fa" /> SURGICAL REMEDIATION
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--tf-ink-muted)", margin: 0, lineHeight: "1.5" }}>
                    {ctrl.remediationAction}
                  </p>
                </div>

                <div style={{ background: "var(--tf-surface-sunken)", padding: "16px 18px", borderRadius: "8px", border: "1px solid var(--tf-line-subtle)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", color: "var(--tf-ink-secondary)", fontSize: "11px", fontWeight: 700 }}>
                    <CheckCircle size={16} color="var(--tf-verified)" /> INDEPENDENT VERIFICATION PROBE
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--tf-ink-muted)", margin: 0, lineHeight: "1.5" }}>
                    {ctrl.independentProbe}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
