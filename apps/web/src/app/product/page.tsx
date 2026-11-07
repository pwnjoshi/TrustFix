import Link from "next/link";
import {
  ArrowRight, CheckCircle, Cloud, Database, Fingerprint,
  FlowArrow, HardDrives, Key, Lightning, LockKey,
  Microphone, ShieldCheck, Sparkle, TerminalWindow, Warning,
} from "@phosphor-icons/react/dist/ssr";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const corePillars = [
  {
    icon: FlowArrow,
    title: "Questionnaire Ingestion & Intent Translation",
    copy: "Upload any customer security questionnaire (CSV, XLSX, or raw text). TrustFix's Google ADK orchestrator parses ambiguous natural language questions and maps them to deterministic Google Cloud control IDs without guessing.",
  },
  {
    icon: Key,
    title: "Keyless Infrastructure Inspection",
    copy: "The TrustFix scanner connects directly to your verified Google Cloud project boundary using keyless Workload Identity. It gathers live IAM policies, resource configurations, and network perimeters without handling static credentials.",
  },
  {
    icon: ShieldCheck,
    title: "Deterministic Code-Backed Evaluation",
    copy: "Pass/fail verdicts are strictly computed by deterministic Python evaluators against collected evidence properties. LLM reasoning is used for requirement parsing, never for deciding compliance truth.",
  },
  {
    icon: LockKey,
    title: "Governed Human-in-the-Loop Remediation",
    copy: "When an exposure is identified, TrustFix calculates the minimal safe mutation (exact IAM delta), verifies zero drift, captures a pre-change rollback snapshot, and halts until an authorized operator explicitly approves.",
  },
  {
    icon: CheckCircle,
    title: "Independent External Verification",
    copy: "Cloud API mutation success alone is never sufficient. TrustFix executes independent, unauthenticated external HTTP probes to mathematically verify that the endpoint returns HTTP 403 Forbidden before certifying the control.",
  },
  {
    icon: Fingerprint,
    title: "Cryptographic Proof Packs",
    copy: "Export tamper-evident, auditor-ready Proof Packs containing timestamped evidence records, SHA-256 digests, operator approval identities, and probe outputs. Give enterprise customers mathematically verified certainty.",
  },
];

const lifecycleSteps = [
  {
    step: "01",
    title: "Ingest Questionnaire",
    desc: "Import vendor security reviews, SOC 2 / ISO 27001 readiness assessments, or enterprise customer spreadsheets.",
  },
  {
    step: "02",
    title: "Map Deterministic Controls",
    desc: "Gemini 3.5 Flash maps requirements to deterministic control IDs (e.g. GCP_STORAGE_PUBLIC_ACCESS, GCP_SQL_PUBLIC_IP).",
  },
  {
    step: "03",
    title: "Inspect Live GCP Target",
    desc: "Dedicated keyless scanner reads live resource configurations across 9 core Google Cloud services.",
  },
  {
    step: "04",
    title: "Deterministic Grading",
    desc: "Code evaluates evidence properties against strict compliance criteria. Gaps generate actionable remediation plans.",
  },
  {
    step: "05",
    title: "Operator Governance Gate",
    desc: "Security leads review exact IAM deltas, drift fingerprints, and automated rollback snapshots before authorizing execution.",
  },
  {
    step: "06",
    title: "Execute & Probe",
    desc: "Asynchronous Cloud Run workers execute the change and run external anonymous HTTP probes to prove access is blocked.",
  },
  {
    step: "07",
    title: "Seal Proof Pack",
    desc: "Tamper-evident JSON/CSV/XLSX bundles are sealed with SHA-256 digests and made available for customer export.",
  },
];

export default function ProductPage() {
  return (
    <main className="marketing-page">
      <MarketingHeader />

      <section className="inner-hero">
        <span className="section-index">PLATFORM ARCHITECTURE</span>
        <h1>Continuous cloud assurance, grounded in infrastructure.</h1>
        <p>
          TrustFix converts vendor questionnaire requirements into deterministic controls, inspects live Google Cloud environments with keyless identities, governs the smallest safe remediations, and attaches cryptographic proof to the final answers.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="/app">
            Launch live workspace <ArrowRight size={14} />
          </a>
          <Link className="button secondary" href="/controls">
            View 9 supported controls
          </Link>
        </div>
      </section>

      {/* Core Platform Pillars */}
      <section className="product-pillars-container">
        <div className="section-header-centered">
          <span className="section-index">HOW IT WORKS</span>
          <h2>Six foundational pillars of autonomous assurance.</h2>
          <p>Built for security engineers who demand mathematical proof rather than AI-generated promises.</p>
        </div>

        <div className="pillars-grid">
          {corePillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article key={pillar.title} className="pillar-card">
                <div className="pillar-icon-wrap">
                  <Icon size={24} />
                </div>
                <h3>{pillar.title}</h3>
                <p>{pillar.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* The Continuous Lifecycle */}
      <section className="product-lifecycle-section">
        <div className="section-header-centered">
          <span className="section-index">END-TO-END WORKFLOW</span>
          <h2>From customer questionnaire to defensible proof.</h2>
          <p>Every transition in TrustFix is audited, persisted, and verified against real cloud resources.</p>
        </div>

        <div className="lifecycle-stepper">
          {lifecycleSteps.map((s) => (
            <div key={s.step} className="lifecycle-step-card">
              <span className="lifecycle-num">{s.step}</span>
              <div className="lifecycle-body">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Zero Hallucination Guarantee Callout */}
      <section className="guarantee-section">
        <div className="guarantee-card">
          <div className="guarantee-icon-wrap">
            <ShieldCheck size={36} />
          </div>
          <div className="guarantee-text">
            <h2>The Zero-Hallucination Compliance Standard</h2>
            <p>
              Many AI compliance tools simply generate convincing paragraphs of text that claim policies are in place.
              TrustFix inverts this model: <strong>Gemini and the Google Agent Development Kit (ADK)</strong> are strictly isolated to requirement interpretation and operational tooling.
              The compliance verdict itself is always calculated by deterministic Python code, and the final state is tested by real network probes.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="final-cta final-cta-v2">
        <span className="section-index">READY FOR REAL ASSURANCE</span>
        <h2>Experience TrustFix on Google Cloud.</h2>
        <p>Connect your verified project, run live security reviews, and generate auditor-ready proof packs in minutes.</p>
        <div className="hero-actions">
          <Link className="button secondary" href="/security">
            Read security model
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
