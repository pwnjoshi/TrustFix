import Link from "next/link";
import {
  ArrowRight, CheckCircle, CloudCheck,
  Fingerprint, FlowArrow, Gauge, LockKey,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { AssuranceHero } from "@/components/assurance-hero";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const workflow = [
  ["01", "Interpret", "Gemini 3.5 Flash maps natural-language requirements to deterministic controls.", "Ambiguous questionnaire language is resolved; unsupported questions are flagged rather than hallucinated."],
  ["02", "Inspect", "Dedicated keyless identities collect current IAM and firewall evidence from Google Cloud.", "No persistent secrets stored—the Cloud Run service account collects live configurations."],
  ["03", "Decide", "Deterministic policy separates safe automation from mandatory human approval.", "Pass/fail criteria are strictly evaluated in code. Zero LLM hallucinations in the security decision."],
  ["04", "Fix", "The smallest drift-protected mutation executes asynchronously with captured rollback.", "Remediation plan is locked to the verified project and requires cryptographic approval."],
  ["05", "Prove", "TrustFix independently tests the security property with external probes and packages evidence.", "Anonymous HTTP probes prove the fix worked before generating an auditor-ready Proof Pack."],
];

const capabilities = [
  [CloudCheck, "Live Cloud Inspection", "Storage IAM, Cloud Run invoker permissions, and internet firewall exposure."],
  [ShieldCheck, "Governed Remediation", "Role-aware approval, minimum-change delta calculation, and automated rollback capture."],
  [Fingerprint, "Evidence Lineage", "Timestamped cryptographic proof attached to every questionnaire answer."],
  [Gauge, "Asynchronous Operation", "Cloud Run Pub/Sub workers handle long-running assurance scans safely."],
  [LockKey, "Separated Authority", "Isolated read-only Scanner and scoped Remediator identities with zero shared keys."],
  [FlowArrow, "Exportable Proof Packs", "Self-contained JSON, CSV, and XLSX manifests with live proof hashes and audit trails."],
] as const;

const architectureLayers = [
  { index: "01", title: "Google IAP", subtitle: "Protected workforce identity", desc: "Zero-trust cryptographic perimeter guarding all workspace operations." },
  { index: "02", title: "Next.js 15", subtitle: "Real-time command center", desc: "High-performance reactive interface with live mission control and theme support." },
  { index: "03", title: "FastAPI", subtitle: "Deterministic control plane", desc: "Strict Pydantic-typed security validation and idempotent approval gating." },
  { index: "04", title: "ADK + Gemini", subtitle: "Agent orchestration", desc: "Natural-language requirement reasoning without hallucinated pass/fail decisions." },
  { index: "05", title: "Pub/Sub Workers", subtitle: "Separated authority", desc: "Isolated scanner worker (viewer) and remediator worker (restricted mutations)." },
  { index: "06", title: "Google Cloud", subtitle: "Target project boundary", desc: "Keyless IAM-scoped target inspection with zero cross-tenant credential leakage." },
];

export default function Landing() {
  return (
    <main className="landing landing-v2">
      <MarketingHeader />
      <AssuranceHero />

      {/* Trust Ribbon */}
      <section className="trust-marquee">
        <div>
          <span>BUILT ON GOOGLE CLOUD</span>
          <strong>Gemini 3.5 Flash</strong>
          <strong>Google ADK</strong>
          <strong>Cloud Run</strong>
          <strong>Firestore</strong>
          <strong>Pub/Sub</strong>
          <strong>Vertex AI</strong>
          <strong>Google IAP</strong>
        </div>
      </section>

      {/* Two Paths */}
      <section className="experience-choice home-choice">
        <article>
          <span className="status neutral">Full Coverage</span>
          <h3>Explore Supported Controls</h3>
          <p>Inspect our deterministic rulebook for Cloud Storage IAM, Cloud Run Invoker, and Compute Engine firewall perimeters.</p>
          <Link href="/controls">
            View controls catalog <ArrowRight size={14} />
          </Link>
        </article>
        <article>
          <span className="status verified">Live Protected Workspace</span>
          <h3>Start Production Workspace</h3>
          <p>Connect a verified Google Cloud project, preserve cryptographic evidence, approve governed changes, and export audit Proof Packs.</p>
          <a href="/app">
            Open workspace <ArrowRight size={14} />
          </a>
        </article>
      </section>

      {/* Problem Statement */}
      <section className="statement-section">
        <span className="section-index">THE PROBLEM</span>
        <h2>
          AI can write a convincing security answer.<br />
          <em>That does not make it true.</em>
        </h2>
        <p>
          TrustFix closes the gap between what an organization claims and what its infrastructure actually proves.
          It does the operational work—not just the talking.
        </p>
      </section>

      {/* Comparison: Old Way vs TrustFix Way */}
      <section className="comparison-v2">
        <div className="old-way">
          <span>THE OLD WAY</span>
          <h3>Static Claims & Spreadsheets</h3>
          {["Search stale documents and wikis", "Draft plausible generated language", "Assume the infrastructure fix worked", "Rebuild audit evidence manually"].map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <div className="versus">VS</div>
        <div className="trustfix-way">
          <span>THE TRUSTFIX WAY</span>
          <h3>Continuously Proven Assurance</h3>
          {[
            "Inspect live Google Cloud infrastructure",
            "Attach resource-specific evidence & lineage",
            "Govern the smallest safe fix with approval",
            "Verify independently with live HTTP probes",
          ].map((item) => (
            <p key={item}>
              <CheckCircle weight="fill" />
              {item}
            </p>
          ))}
        </div>
      </section>

      {/* Operating Loop */}
      <section className="workflow-v2" id="workflow">
        <header>
          <span className="section-index">AUTONOMOUS OPERATING LOOP</span>
          <h2>Observe. Decide. Fix. Prove.</h2>
          <p>Reasoning where ambiguity exists. Deterministic controls where truth can be measured.</p>
        </header>
        <ol>
          {workflow.map(([index, title, copy, detail]) => (
            <li key={index}>
              <span>{index}</span>
              <div>
                <strong>{title}</strong>
                <p>{copy}</p>
                <small style={{ color: "var(--muted)", fontSize: "11px", display: "block", marginTop: "4px" }}>{detail}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Capabilities Grid */}
      <section className="capability-stage" id="controls">
        <div className="capability-copy">
          <span className="section-index">DEEP, NOT DECORATIVE</span>
          <h2>Autonomy with a safety case.</h2>
          <p>
            TrustFix makes its authority visible. Every proposed mutation carries the exact delta, risk, dependencies,
            rollback, drift fingerprint, approval, and post-change verification.
          </p>
          <Link href="/security">
            Explore the security architecture <ArrowRight />
          </Link>
        </div>
        <div className="capability-cards">
          {capabilities.map(([Icon, title, copy]) => (
            <article key={String(title)}>
              <Icon size={24} />
              <h3>{String(title)}</h3>
              <p>{String(copy)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Architecture Stage */}
      <section className="architecture-v2">
        <header>
          <span className="section-index">PRODUCTION-MINDED BY DESIGN</span>
          <h2>
            One visible workflow.<br />
            Six separated trust boundaries.
          </h2>
        </header>
        <div className="architecture-rail">
          {architectureLayers.map((layer) => (
            <div key={layer.index}>
              <span>{layer.index}</span>
              <strong>{layer.title}</strong>
              <small>{layer.subtitle}</small>
              <p style={{ margin: "6px 0 0", fontSize: "11px", color: "var(--muted)", lineHeight: 1.4 }}>{layer.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Proof Pack Manifest Preview */}
      <section className="demo-console" style={{ maxWidth: "1080px", margin: "60px auto" }}>
        <div className="demo-console-head">
          <div>
            <span className="micro">CRYPTOGRAPHIC PROOF PACK MANIFEST</span>
            <h2>Audit-ready evidence lineage for customer security reviews.</h2>
          </div>
          <span className="status verified">
            <CheckCircle weight="fill" /> Verified
          </span>
        </div>
        <div style={{ padding: "20px 24px", background: "var(--surface-soft)" }}>
          <pre
            style={{
              margin: 0,
              padding: "16px 20px",
              background: "var(--surface-strong)",
              borderRadius: "10px",
              color: "#93c5fd",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              lineHeight: 1.6,
              overflowX: "auto",
            }}
          >
{`{
  "statement": "Evidence-backed cloud assurance proof pack",
  "workspace_id": "workspace-production-security",
  "target_project": "acme-production-target",
  "last_verified_at": "2026-08-29T13:45:00Z",
  "assurance_score": 100,
  "controls_evaluated": [
    {
      "control_id": "GCP_STORAGE_PUBLIC_ACCESS",
      "status": "VERIFIED",
      "resource": "gs://acme-customer-storage",
      "evidence_hash": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      "remediation": {
        "status": "APPLIED_AND_PROVEN",
        "action": "Removed allUsers from roles/storage.objectViewer",
        "independent_probe": "GET https://storage.googleapis.com/acme-customer-storage -> HTTP 403 Forbidden"
      }
    }
  ],
  "approver": "security-lead@acme.com",
  "orchestrator": "Google ADK · Gemini 3.5 Flash"
}`}
          </pre>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="final-cta final-cta-v2">
        <FlowArrow size={36} />
        <span className="section-index">FROM CLAIM TO PROOF</span>
        <h2>
          See autonomous assurance<br />
          finish the work.
        </h2>
        <p>Explore our deterministic controls catalog, or launch your live workspace backed by Google Cloud IAM.</p>
        <div className="hero-actions">
          <Link className="button secondary" href="/controls">
            Explore controls catalog
          </Link>
          <a className="button primary" href="/app">
            Launch live workspace <ArrowRight size={14} />
          </a>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
