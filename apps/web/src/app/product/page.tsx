import { ArrowRight, CheckCircle, Fingerprint, FlowArrow, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const features = [
  [FlowArrow, "Review orchestration", "Import a questionnaire, map supported requirements, coordinate asynchronous scans, and preserve every status transition."],
  [Fingerprint, "Evidence records", "Keep the source, project, resource identifier, relevant properties, collection time, and verification state."],
  [ShieldCheck, "Governed remediation", "Show the current state, exact delta, impact, rollback, risk, and policy decision before execution."],
  [CheckCircle, "Independent verification", "Re-run the original control and an external probe where practical. API success alone never means verified."],
] as const;

const operatingLoop = [
  "Interpret the natural-language requirement", "Map it to a deterministic control", "Inspect the verified target project",
  "Collect resource-specific evidence", "Evaluate pass, fail, or incomplete", "Plan the minimum safe remediation",
  "Apply policy and human approval", "Execute with drift protection", "Re-test the security property",
  "Export the verified answer and audit trail",
];

export default function ProductPage() {
  return <main className="marketing-page"><MarketingHeader/>
    <section className="inner-hero"><span className="section-index">PRODUCT</span><h1>Security review operations, grounded in infrastructure.</h1><p>TrustFix converts questionnaire requirements into measurable controls, inspects Google Cloud, governs the smallest safe remediation, and attaches proof to the final answer.</p><div className="hero-actions"><a className="button primary" href="/app">Launch workspace <ArrowRight size={14}/></a><Link className="button secondary" href="/controls">Explore controls catalog</Link></div></section>
    <section className="detail-grid">{features.map(([Icon, title, copy]) => <article key={title}><Icon size={24}/><h2>{title}</h2><p>{copy}</p></article>)}</section>
    <section className="product-workflow"><div><span className="section-index">THE OPERATING LOOP</span><h2>From question to defensible answer.</h2></div><ol>{operatingLoop.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol></section>
    <MarketingFooter/>
  </main>;
}
