"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  ArrowRight, CheckCircle, Cloud, Code, Database,
  Fingerprint, HardDrives, Key, LockKey, ShieldCheck,
  ShieldWarning, Warning, MagnifyingGlass,
} from "@phosphor-icons/react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

const supportedControls = [
  {
    id: "GCP_STORAGE_PUBLIC_ACCESS",
    title: "Storage IAM Public Access Prevention",
    service: "Google Cloud Storage",
    category: "Storage & Databases",
    severity: "HIGH",
    description: "Guarantees no customer Cloud Storage bucket grants anonymous or public read/write permissions (roles/storage.objectViewer, roles/storage.admin) to allUsers or allAuthenticatedUsers.",
    evidenceCollected: "Bucket IAM policy bindings, Uniform Bucket-Level Access (UBLA) status, Public Access Prevention (PAP) configuration.",
    remediationAction: "Surgically removes only public principal IAM bindings while preserving all engineering and service identities. Enforces Public Access Prevention and records rollback snapshot.",
    independentProbe: "Executes unauthenticated external HTTP GET request against the bucket endpoint and confirms HTTP 403 Forbidden.",
  },
  {
    id: "GCP_RUN_PUBLIC_INVOKER",
    title: "Cloud Run Unauthenticated Invocation Gating",
    service: "Cloud Run",
    category: "Compute & Containers",
    severity: "CRITICAL",
    description: "Guarantees that internal microservices and APIs do not grant roles/run.invoker to anonymous callers without Google Identity-Aware Proxy or authenticated IAM token verification.",
    evidenceCollected: "Service IAM policy, ingress traffic annotations (all vs internal vs internal-and-cloud-load-balancing), and authentication requirements.",
    remediationAction: "Purges unauthenticated invoker IAM permissions and enforces authenticated service-to-service IAM tokens.",
    independentProbe: "Attempts anonymous HTTP POST/GET to the Cloud Run service URL and verifies rejection with HTTP 401 Unauthorized or 403 Forbidden.",
  },
  {
    id: "GCP_FIREWALL_ADMIN_EXPOSURE",
    title: "VPC Ingress Administrative Port Lockdown",
    service: "Compute Engine & VPC Firewall",
    category: "Telemetry & Network",
    severity: "CRITICAL",
    description: "Verifies that ingress firewall rules do not expose sensitive administrative ports (SSH 22, RDP 3389, or unrestricted 0-65535) to the open internet (0.0.0.0/0).",
    evidenceCollected: "VPC Firewall rules, source IP CIDR ranges, allowed protocol/port specifications, rule priority, and disabled state.",
    remediationAction: "Restricts source IP range to trusted internal VPC CIDRs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) or Identity-Aware Proxy CIDR (35.235.240.0/20).",
    independentProbe: "Validates firewall rule evaluation engine confirms no internet-facing allow paths exist for administrative ports.",
  },
  {
    id: "GCP_SQL_PUBLIC_IP",
    title: "Cloud SQL Database Network Isolation & TLS",
    service: "Cloud SQL",
    category: "Storage & Databases",
    severity: "HIGH",
    description: "Ensures production relational databases (PostgreSQL, MySQL, SQL Server) disable public IPv4 network interfaces, enforce Private Service Connect (PSC), and mandate SSL/TLS client certificates.",
    evidenceCollected: "Instance IP configuration (ipv4Enabled, privateNetwork), authorized networks list, requireSsl enforcement state.",
    remediationAction: "Disables public IPv4 assignment, binds database instance to authorized private VPC subnet, and enforces requireSsl=true.",
    independentProbe: "Queries Cloud SQL Admin API and network connectivity tests to verify zero public endpoint routing.",
  },
  {
    id: "GCP_KMS_KEY_ROTATION",
    title: "Cryptographic Key 90-Day Automated Rotation",
    service: "Cloud Key Management Service (KMS)",
    category: "Security & IAM",
    severity: "MEDIUM",
    description: "Audits Customer-Managed Encryption Keys (CMEK) to enforce an automated rotation period of 90 days or fewer, preventing stale cryptographic exposure.",
    evidenceCollected: "CryptoKey rotationPeriod, nextRotationTime, key ring locations, and primary version state.",
    remediationAction: "Configures rotationPeriod to 7776000s (90 days) on customer-managed keys without automated schedules.",
    independentProbe: "Cloud KMS API confirms active automatic rotation schedule on all verified CryptoKeys.",
  },
  {
    id: "GCP_IAM_KEYLESS_WORKLOADS",
    title: "Keyless IAM Workload Identity Federation",
    service: "Cloud IAM & Resource Manager",
    category: "Security & IAM",
    severity: "HIGH",
    description: "Identifies and flags exportable, user-managed JSON service account keys, enforcing Google Cloud Workload Identity Federation and short-lived OAuth tokens.",
    evidenceCollected: "List of service account keys, keyType (USER_MANAGED vs SYSTEM_MANAGED), creation timestamp, and expiration date.",
    remediationAction: "Flags exportable keys for revocation and drafts migration plan to keyless Workload Identity token federation.",
    independentProbe: "Verifies zero active user-managed keys on service identities via Cloud IAM API.",
  },
  {
    id: "GCP_LOGGING_ADMIN_AUDIT",
    title: "Cloud Audit Trail Logging & Retention",
    service: "Cloud Logging & Cloud Monitoring",
    category: "Telemetry & Network",
    severity: "MEDIUM",
    description: "Verifies that Admin Activity and Data Access audit logging sinks are enabled across all project services with minimum 365-day compliance retention.",
    evidenceCollected: "Project audit config, log sinks, destination storage/bucket, retention period, and filter expressions.",
    remediationAction: "Enables required audit log types (ADMIN_READ, DATA_READ, DATA_WRITE) and configures compliance sink.",
    independentProbe: "Queries Cloud Logging API to confirm active log emission and ingestion for administrative actions.",
  },
  {
    id: "GCP_SECRET_MANAGER_ROTATION_IAM",
    title: "Secret Manager Access Gating & Key Rotation",
    service: "Secret Manager",
    category: "Security & IAM",
    severity: "HIGH",
    description: "Ensures production API keys, tokens, and database passwords restrict accessor IAM permissions and maintain automated secret rotation schedules.",
    evidenceCollected: "Secret IAM policy bindings, rotation schedule, version states (ENABLED, DESTROYED), and access audit configs.",
    remediationAction: "Removes unauthenticated or broad viewer access, restricts secret accessor role to authorized service identities.",
    independentProbe: "Validates secret IAM policy rejects unauthorized principals and confirms version lifecycle.",
  },
  {
    id: "GCP_GKE_PRIVATE_CLUSTER",
    title: "GKE Private Cluster & Control Plane Isolation",
    service: "Google Kubernetes Engine (GKE)",
    category: "Compute & Containers",
    severity: "CRITICAL",
    description: "Audits Kubernetes clusters to guarantee master control plane endpoints disable public exposure and worker node pools operate strictly on private subnets.",
    evidenceCollected: "Cluster privateClusterConfig (enablePrivateNodes, enablePrivateEndpoint, masterIpv4CidrBlock), authorized networks config.",
    remediationAction: "Enables private nodes, restricts master endpoint access to authorized CIDRs, and enforces Shielded GKE nodes.",
    independentProbe: "Tests master API endpoint from external unauthenticated network to verify zero internet routing.",
  },
];

const categories = [
  "All Categories",
  "Compute & Containers",
  "Storage & Databases",
  "Security & IAM",
  "Telemetry & Network",
];

export default function ControlsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return supportedControls.filter((ctrl) => {
      const matchesCategory = selectedCategory === "All Categories" || ctrl.category === selectedCategory;
      const matchesSearch = !search ||
        ctrl.title.toLowerCase().includes(search.toLowerCase()) ||
        ctrl.id.toLowerCase().includes(search.toLowerCase()) ||
        ctrl.service.toLowerCase().includes(search.toLowerCase()) ||
        ctrl.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, search]);

  return (
    <main className="marketing-page">
      <MarketingHeader />

      <section className="inner-hero">
        <span className="section-index">CONTROLS CATALOG</span>
        <h1>Deterministic Google Cloud security controls.</h1>
        <p>
          TrustFix evaluates customer questionnaire requirements against code-backed Google Cloud control definitions across 9 core services.
          Zero hallucinated answers—every control is inspected live and backed by cryptographic proof.
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

      <section className="controls-catalog-container">
        {/* Search and Category Filters */}
        <div className="controls-filter-bar">
          <div className="controls-search-wrap">
            <MagnifyingGlass size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search controls, services, or resource types…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="controls-search-input"
            />
          </div>

          <div className="controls-category-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Controls List */}
        <div className="controls-grid">
          {filtered.map((ctrl) => (
            <article key={ctrl.id} className="control-detail-card">
              <header className="control-card-header">
                <div>
                  <span className="control-card-meta">
                    {ctrl.id} · {ctrl.service.toUpperCase()}
                  </span>
                  <h2>{ctrl.title}</h2>
                  <span className="control-card-category">{ctrl.category}</span>
                </div>
                <span className={`status ${ctrl.severity === "CRITICAL" ? "failed" : ctrl.severity === "HIGH" ? "needs-review" : "neutral"}`}>
                  {ctrl.severity} SEVERITY
                </span>
              </header>

              <p className="control-card-desc">
                {ctrl.description}
              </p>

              <div className="control-specs-grid">
                <div className="spec-box">
                  <div className="spec-label">
                    <Fingerprint size={16} className="spec-icon evidence" /> EVIDENCE COLLECTED
                  </div>
                  <p>{ctrl.evidenceCollected}</p>
                </div>

                <div className="spec-box">
                  <div className="spec-label">
                    <ShieldCheck size={16} className="spec-icon remediation" /> SURGICAL REMEDIATION
                  </div>
                  <p>{ctrl.remediationAction}</p>
                </div>

                <div className="spec-box">
                  <div className="spec-label">
                    <CheckCircle size={16} className="spec-icon verification" /> INDEPENDENT VERIFICATION PROBE
                  </div>
                  <p>{ctrl.independentProbe}</p>
                </div>
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="empty-state">
              <Warning size={28} />
              <h2>No matching controls found</h2>
              <p>Try clearing your search query or choosing another category filter.</p>
              <button
                type="button"
                className="button secondary"
                onClick={() => { setSearch(""); setSelectedCategory("All Categories"); }}
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
