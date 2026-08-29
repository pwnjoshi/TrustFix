import { ArrowRight, CheckCircle, Key, LockKey, ShieldCheck, UsersThree } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const principles = [
  [Key, "Dedicated identities", "Web, API, scanner, and remediator services use separate Cloud Run identities."],
  [LockKey, "Least privilege", "The scanner is read-oriented. Storage mutation is scoped to the disposable demo bucket."],
  [UsersThree, "Workspace authorization", "Google IAP authenticates users; backend role checks enforce Owner, Admin, Reviewer, and Viewer permissions."],
  [ShieldCheck, "Governed changes", "Sensitive changes require an approval record and idempotency key. Unexpected drift aborts execution."],
  [CheckCircle, "Evidence before answers", "A control becomes verified only after the measurable property passes again."],
] as const;

export default function SecurityPage() {
  return (
    <main className="marketing-page">
      <MarketingHeader />
      <section className="inner-hero">
        <span className="section-index">SECURITY</span>
        <h1>Autonomy with explicit boundaries.</h1>
        <p>
          TrustFix is designed as security infrastructure: separated identities, tenant-scoped records,
          authenticated access, approval gates, drift checks, and proof after every change.
        </p>
      </section>

      <section className="security-principles">
        {principles.map(([Icon, title, copy]) => (
          <article key={title}>
            <Icon size={24} />
            <div>
              <h2>{title}</h2>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="boundary-table">
        <div>
          <span className="section-index">CURRENT SUPPORT BOUNDARY</span>
          <h2>What the deployed build does today.</h2>
        </div>
        <div>
          <p><strong>Automatic observation</strong> Storage IAM, Cloud Run IAM, and internet-exposed administrative firewall ports.</p>
          <p><strong>Live governed mutation</strong> Public-access removal for the explicitly named disposable TrustFix bucket.</p>
          <p><strong>Approval-only planning</strong> Cloud Run and firewall findings remain inspectable, but mutation executors stay disabled until dedicated rollback acceptance tests pass.</p>
          <p><strong>Never claimed</strong> Drive, Gmail, Slack, HR, training, and policy-document evidence without a connected source.</p>
        </div>
      </section>

      <section className="final-cta" style={{ maxWidth: "1080px", margin: "40px auto 80px", textAlign: "center" }}>
        <ShieldCheck size={36} style={{ color: "var(--tf-verified)" }} />
        <h2>Audit-ready safety case for enterprise cloud.</h2>
        <p style={{ color: "var(--tf-ink-muted)", maxWidth: "560px", margin: "12px auto 24px" }}>
          Ready to verify your Google Cloud controls with zero shared static credentials?
        </p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <a className="button primary" href="/app">
            Launch live workspace <ArrowRight size={14} />
          </a>
          <Link className="button secondary" href="/controls">
            View controls catalog
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
