import Link from "next/link";
import {
  ArrowRight, CheckCircle, CloudCheck,
  Database, Fingerprint, FlowArrow, Gauge, Key, LockKey,
  ShieldCheck, TerminalWindow, XCircle,
} from "@phosphor-icons/react/dist/ssr";
import { AssuranceHero } from "@/components/assurance-hero";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const ecosystem = [
  "Google Agent Development Kit (ADK)",
  "Gemini 3.5 Flash · Vertex AI",
  "Google Cloud Run",
  "Cloud Firestore",
  "Cloud Pub/Sub",
  "Identity-Aware Proxy (IAP)",
  "Cloud KMS (CMEK)",
  "Cloud Asset Inventory",
];

const workflow = [
  {
    index: "01",
    title: "Interpret & Translate",
    copy: "Gemini 3.5 Flash maps natural-language questionnaire requirements to deterministic Google Cloud controls.",
    detail: "Ambiguous vendor security questions are resolved to code-backed control IDs. Unsupported inquiries are explicitly flagged rather than hallucinated.",
  },
  {
    index: "02",
    title: "Keyless Inspection",
    copy: "Dedicated, project-scoped scanner identities collect live configuration state directly from Google Cloud APIs.",
    detail: "Zero static service account keys or stored passwords. The scanner executes via Workload Identity with read-only viewer boundaries.",
  },
  {
    index: "03",
    title: "Deterministic Evaluation",
    copy: "Strict code-backed policy evaluators calculate pass/fail status against collected evidence properties.",
    detail: "Compliance criteria are evaluated in deterministic Python. Zero LLM hallucinations are permitted in the final pass/fail security verdict.",
  },
  {
    index: "04",
    title: "Governed Remediation",
    copy: "The smallest safe mutation is drafted with exact IAM deltas, drift fingerprints, and automated rollback snapshots.",
    detail: "All mutations are locked to the verified project boundary. Execution is halted until an authorized operator reviews and approves the change.",
  },
  {
    index: "05",
    title: "Independent Verification",
    copy: "TrustFix runs external HTTP probes to independently confirm that public access is blocked before sealing the proof.",
    detail: "Anonymous probes mathematically prove the fix worked. Results are compiled into an immutable, SHA-256 sealed Cryptographic Proof Pack.",
  },
];

const capabilities = [
  [CloudCheck, "Multi-Service Cloud Inspection", "Live auditing across 9 Google Cloud services: Storage, Cloud Run, VPC Firewalls, Cloud SQL, KMS, IAM, Logging, Secrets, and GKE."],
  [ShieldCheck, "Human-Governed Remediation", "Role-aware approval gates, minimum-change IAM delta calculation, and pre-change rollback snapshot capture."],
  [Fingerprint, "Cryptographic Lineage", "Every questionnaire answer is backed by an immutable SHA-256 evidence digest and timestamped API observations."],
  [Gauge, "Asynchronous Worker Architecture", "Cloud Run Pub/Sub worker services safely handle long-running security posture audits with zero timeouts."],
  [LockKey, "Separated Authority Boundaries", "Isolated read-only Scanner and strictly scoped Remediator identities with zero shared static credentials."],
  [FlowArrow, "Audit-Ready Export Packs", "Self-contained JSON, CSV, and XLSX manifests with complete proof hashes, approver identities, and audit trails."],
] as const;

const architectureLayers = [
  { index: "01", title: "Google Identity-Aware Proxy", subtitle: "Zero-Trust Perimeter", desc: "Cryptographic workforce perimeter guarding all workspace operations and operator sessions." },
  { index: "02", title: "Next.js 15 Command Center", subtitle: "Real-Time Telemetry", desc: "High-performance reactive interface with live mission control, dark/light themes, and audio telemetry." },
  { index: "03", title: "FastAPI Deterministic Plane", subtitle: "Strict Security Validation", desc: "Pydantic-typed security schemas, deterministic policy evaluators, and idempotent approval gates." },
  { index: "04", title: "Google ADK + Gemini", subtitle: "Autonomous Orchestrator", desc: "Natural-language requirement reasoning without hallucinated pass/fail decisions or unverified claims." },
  { index: "05", title: "Pub/Sub Worker Fleet", subtitle: "Separated Authority", desc: "Isolated scanner workers (read-only viewer) and remediator workers (scoped mutation with rollback)." },
  { index: "06", title: "Target Project Boundary", subtitle: "Verified Target Scope", desc: "Keyless IAM-scoped target inspection with zero cross-tenant credential storage or token leakage." },
];

export default function Landing() {
  return (
    <main className="landing landing-v2">
      <MarketingHeader />
      <AssuranceHero />

      {/* Ecosystem Ribbon */}
      <section className="trust-marquee" aria-label="Google Cloud Technologies">
        <div>
          <span>ENGINEERED ON GOOGLE CLOUD</span>
          {ecosystem.map((tech) => (
            <strong key={tech}>{tech}</strong>
          ))}
        </div>
      </section>

      {/* Two Paths */}
      <section className="experience-choice home-choice">
        <article>
          <span className="status neutral">9 Supported Services</span>
          <h3>Explore Controls Catalog</h3>
          <p>Inspect our deterministic security rulebook across Google Cloud Storage, Cloud Run, VPC Firewalls, Cloud SQL, KMS, IAM, Logging, Secrets, and GKE.</p>
          <Link href="/controls">
            View controls catalog <ArrowRight size={14} />
          </Link>
        </article>
        <article>
          <span className="status verified">Live Protected Workspace</span>
          <h3>Launch Command Center</h3>
          <p>Connect your verified Google Cloud project, run automated keyless assurance scans, approve governed remediations, and export cryptographic Proof Packs.</p>
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
          Vendors and enterprise customers no longer accept static self-assessments or unverified AI summaries.
          TrustFix closes the gap between what an organization claims and what its cloud infrastructure actually proves.
          It does the operational engineering work—not just the talking.
        </p>
      </section>

      {/* Comparison: Old Way vs TrustFix Way */}
      <section className="comparison-v2">
        <div className="old-way">
          <span className="comp-tag old">THE LEGACY PARADIGM</span>
          <h3>Static Claims & Outdated Spreadsheets</h3>
          {[
            "Search stale compliance wikis and outdated architecture diagrams",
            "Generate plausible-sounding AI responses with zero infrastructure validation",
            "Assume a manual cloud console tweak fixed the exposure without testing",
            "Manually reconstruct audit evidence screenshots before customer audits",
          ].map((item) => (
            <div key={item} className="comp-item">
              <XCircle weight="fill" className="comp-icon-fail" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="versus-pill">VS</div>

        <div className="trustfix-way">
          <span className="comp-tag modern">THE TRUSTFIX PARADIGM</span>
          <h3>Continuous, Evidence-Backed Assurance</h3>
          {[
            "Inspect live Google Cloud infrastructure via keyless service account identities",
            "Attach resource-specific evidence digests and cryptographic audit trails",
            "Govern the smallest safe mutation with explicit human approval and rollback",
            "Independently verify with external anonymous HTTP probes before sealing",
          ].map((item) => (
            <div key={item} className="comp-item">
              <CheckCircle weight="fill" className="comp-icon-pass" />
              <span>{item}</span>
            </div>
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
          {workflow.map((item) => (
            <li key={item.index}>
              <span className="step-num">{item.index}</span>
              <div className="step-body">
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
                <small>{item.detail}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Capabilities Grid */}
      <section className="capability-stage" id="controls">
        <div className="capability-copy">
          <span className="section-index">DEEP, NOT DECORATIVE</span>
          <h2>Autonomy with an audit-ready safety case.</h2>
          <p>
            TrustFix makes its authority completely visible. Every proposed mutation carries the exact delta,
            risk classification, dependencies, pre-change rollback fingerprint, approval record, and post-change independent verification.
          </p>
          <Link href="/security" className="text-link">
            Explore the zero-trust security architecture <ArrowRight size={14} />
          </Link>
        </div>
        <div className="capability-cards">
          {capabilities.map(([Icon, title, copy]) => (
            <article key={String(title)}>
              <div className="cap-icon-wrap">
                <Icon size={22} />
              </div>
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
            One continuous assurance workflow.<br />
            Six separated trust boundaries.
          </h2>
        </header>
        <div className="architecture-rail">
          {architectureLayers.map((layer) => (
            <div key={layer.index} className="arch-card">
              <span className="arch-index">{layer.index}</span>
              <strong>{layer.title}</strong>
              <small>{layer.subtitle}</small>
              <p>{layer.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Proof Pack Manifest Preview */}
      <section className="demo-console">
        <div className="demo-console-head">
          <div>
            <span className="micro">CRYPTOGRAPHIC PROOF PACK MANIFEST</span>
            <h2>Audit-ready evidence lineage for customer security reviews.</h2>
          </div>
          <span className="status verified">
            <CheckCircle weight="fill" /> Tamper-Evident Sealed
          </span>
        </div>
        <div className="demo-console-body">
          <pre className="proof-manifest-code">
{`{
  "statement": "Evidence-backed Google Cloud assurance proof pack",
  "workspace_id": "workspace-enterprise-security",
  "target_project": "acme-production-cloud",
  "sealed_at": "2026-08-29T21:20:00Z",
  "assurance_score": 100,
  "inspection_scope": [
    "Cloud Storage", "Cloud Run", "VPC Firewalls", "Cloud SQL",
    "Cloud KMS", "Keyless IAM", "Cloud Logging", "Secret Manager", "GKE"
  ],
  "controls_evaluated": [
    {
      "control_id": "GCP_STORAGE_PUBLIC_ACCESS",
      "status": "VERIFIED",
      "resource": "gs://acme-customer-storage",
      "evidence_digest": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      "remediation": {
        "status": "APPLIED_AND_PROVEN",
        "action": "Removed allUsers from roles/storage.objectViewer",
        "pre_change_rollback": "captured",
        "independent_probe": "GET https://storage.googleapis.com/acme-customer-storage -> HTTP 403 Forbidden"
      }
    },
    {
      "control_id": "GCP_SQL_PUBLIC_IP",
      "status": "VERIFIED",
      "resource": "projects/acme-production-cloud/instances/acme-postgres-prod",
      "evidence_digest": "sha256:3a19b88f91240c31a789ef4881023a10984decf471bc294021fa31298401ecf2",
      "observation": "Enforces Private Service Connect and requires SSL/TLS client encryption."
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
        <FlowArrow size={34} className="cta-symbol" />
        <span className="section-index">FROM CLAIM TO PROOF</span>
        <h2>
          See autonomous assurance<br />
          finish the work.
        </h2>
        <p>Explore our deterministic controls catalog, or launch your live workspace protected by Google Identity-Aware Proxy.</p>
        <div className="hero-actions">
          <Link className="button secondary" href="/controls">
            Explore 9 controls catalog
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
