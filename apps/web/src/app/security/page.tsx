import Link from "next/link";
import {
  ArrowRight, CheckCircle, Database, Eye, Fingerprint,
  HardDrives, Key, LockKey, ShieldCheck, UserCheck, UsersThree, Warning,
} from "@phosphor-icons/react/dist/ssr";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const securityPrinciples = [
  {
    icon: Key,
    title: "Dedicated Keyless Identities",
    desc: "Frontend web, backend API control planes, background scanner workers, and remediator workers each run under distinct, least-privilege Google Cloud Service Accounts with Workload Identity Federation. No shared permanent API keys or exported JSON service account keys exist.",
  },
  {
    icon: LockKey,
    title: "Strict Separation of Authority",
    desc: "The TrustFix scanner worker is strictly read-only (Viewer & Cloud Asset Viewer roles). It is mathematically incapable of mutating cloud infrastructure. Remediation operations run in an isolated worker with explicit project and resource bounds.",
  },
  {
    icon: UserCheck,
    title: "Google Identity-Aware Proxy (IAP)",
    desc: "All web and API access is guarded by Google Identity-Aware Proxy (IAP) with signed JWT token validation. Role-Based Access Control (RBAC) enforces granular Owner, Admin, Security Reviewer, and Viewer permissions across all workspace endpoints.",
  },
  {
    icon: ShieldCheck,
    title: "Human-in-the-Loop Governance Gates",
    desc: "No cloud infrastructure mutation can be applied without explicit approval from an authorized workspace operator. Approvals require cryptographic idempotency keys, pre-change drift fingerprints, and automated rollback snapshots.",
  },
  {
    icon: Fingerprint,
    title: "Tamper-Evident Evidence Lineage",
    desc: "Every observation is bound to its Google Cloud resource identifier, timestamp, and immutable SHA-256 content digest. Completed review bundles produce a sealed Proof Pack with verified digital signatures.",
  },
  {
    icon: Eye,
    title: "Independent External Verification Probes",
    desc: "TrustFix never accepts cloud API return codes as final proof of security. When remediating public exposure, an unauthenticated external HTTP probe is executed against the resource URL to mathematically verify that it returns HTTP 403 Forbidden.",
  },
];

const boundaryRules = [
  {
    service: "Cloud Storage",
    observation: "Bucket IAM policies, Uniform Bucket-Level Access (UBLA), and Public Access Prevention (PAP).",
    mutation: "Surgically removes public principals (allUsers, allAuthenticatedUsers) from roles/storage.objectViewer and enables PAP. Rollback captures pre-change IAM.",
    verification: "Independent anonymous external HTTP GET probe confirms HTTP 403 Forbidden.",
  },
  {
    service: "Cloud Run",
    observation: "Service IAM bindings, ingress traffic settings, and unauthenticated invoker role grants.",
    mutation: "Purges roles/run.invoker from anonymous callers; enforces authenticated IAP/IAM token ingress.",
    verification: "External unauthenticated HTTP request verifies HTTP 401 Unauthorized / 403 Forbidden.",
  },
  {
    service: "VPC Firewalls",
    observation: "Ingress firewall rules, source CIDR ranges (0.0.0.0/0), target tags, and administrative port exposure (SSH 22, RDP 3389).",
    mutation: "Restricts allowed source CIDRs to internal VPC ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) or Cloud IAP proxy range (35.235.240.0/20).",
    verification: "Firewall rule engine re-evaluation confirms zero internet-facing allow paths.",
  },
  {
    service: "Cloud SQL",
    observation: "Instance IP interfaces, public IPv4 configuration, authorized networks lists, and requireSsl enforcement state.",
    mutation: "Disables public IPv4 assignment, binds instance to authorized private VPC subnet, and enforces TLS encryption.",
    verification: "Cloud SQL API confirms privateNetwork binding and zero public network routes.",
  },
  {
    service: "Cloud KMS",
    observation: "Customer-Managed Encryption Keys (CMEK), rotation periods, next rotation schedule, and key ring hierarchy.",
    mutation: "Applies 90-day (7776000s) automated rotation schedule to CryptoKeys lacking rotation policies.",
    verification: "KMS API confirms active automatic rotation schedule.",
  },
  {
    service: "Keyless IAM",
    observation: "User-managed exportable JSON service account keys vs keyless Workload Identity token federation.",
    mutation: "Flags exportable keys for revocation and drafts migration plan to Workload Identity.",
    verification: "Cloud IAM API verifies zero active user-managed keys on monitored service identities.",
  },
];

export default function SecurityPage() {
  return (
    <main className="marketing-page">
      <MarketingHeader />

      <section className="inner-hero">
        <span className="section-index">SECURITY & BOUNDARIES</span>
        <h1>Autonomy with explicit architectural boundaries.</h1>
        <p>
          TrustFix is engineered as defense-grade security infrastructure: separated keyless identities, tenant-scoped boundaries,
          authenticated Google IAP perimeter, human approval gates, drift detection, and independent proof after every change.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="/app">
            Launch live workspace <ArrowRight size={14} />
          </a>
          <Link className="button secondary" href="/controls">
            View controls catalog
          </Link>
        </div>
      </section>

      {/* Security Architecture Principles */}
      <section className="security-principles-container">
        <div className="section-header-centered">
          <span className="section-index">CORE SECURITY MODEL</span>
          <h2>Six foundational zero-trust controls.</h2>
          <p>Every operational action is bounded by deterministic code, least privilege, and cryptographic attestation.</p>
        </div>

        <div className="security-principles-grid">
          {securityPrinciples.map((principle) => {
            const Icon = principle.icon;
            return (
              <article key={principle.title} className="principle-card">
                <div className="principle-icon-wrap">
                  <Icon size={24} />
                </div>
                <h3>{principle.title}</h3>
                <p>{principle.desc}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Support Boundary Matrix */}
      <section className="boundary-matrix-container">
        <div className="section-header-centered">
          <span className="section-index">INSPECTION & MUTATION BOUNDARIES</span>
          <h2>Explicit operational scope by service.</h2>
          <p>We believe in absolute transparency: here is exactly what TrustFix inspects, governs, and verifies.</p>
        </div>

        <div className="boundary-table-wrap">
          <table className="boundary-table-v2">
            <thead>
              <tr>
                <th>Google Cloud Service</th>
                <th>Live Observation Scope</th>
                <th>Governed Mutation Action</th>
                <th>Independent Verification</th>
              </tr>
            </thead>
            <tbody>
              {boundaryRules.map((rule) => (
                <tr key={rule.service}>
                  <td className="service-name-cell">
                    <strong>{rule.service}</strong>
                  </td>
                  <td>{rule.observation}</td>
                  <td>{rule.mutation}</td>
                  <td>
                    <span className="verification-badge">
                      <CheckCircle weight="fill" /> {rule.verification}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* What TrustFix Never Claims */}
      <section className="explicit-exclusions-section">
        <div className="exclusion-card">
          <div className="exclusion-icon-wrap">
            <Warning size={32} />
          </div>
          <div className="exclusion-text">
            <h3>Explicit Assurance Boundary Notice</h3>
            <p>
              TrustFix never assumes or guesses evidence. If a questionnaire asks about HR offboarding, employee background checks, physical data center badge access, or policies stored in unlinked third-party tools, TrustFix marks the requirement as <strong>NEEDS MANUAL EVIDENCE</strong> rather than inventing an answer.
              Our assurance score is calculated strictly from verified, code-backed observations.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="final-cta final-cta-v2">
        <ShieldCheck size={36} className="cta-symbol" />
        <h2>Audit-ready safety case for enterprise cloud.</h2>
        <p>Ready to verify your Google Cloud controls with zero shared static credentials?</p>
        <div className="hero-actions">
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
