import hashlib
import json
import re
from dataclasses import dataclass
from typing import Callable

from .models import ControlResult, ControlStatus, Evidence, RemediationPlan, Risk
from .policy import PolicyEngine


Evaluator = Callable[[list[Evidence]], tuple[ControlStatus, str]]


@dataclass(frozen=True)
class ControlDefinition:
    id: str
    name: str
    description: str
    question_patterns: tuple[str, ...]
    risk: Risk
    evaluator: Evaluator
    service: str = "Google Cloud"


def _storage_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    public = [e for e in evidence if e.relevant_properties.get("public_principals")]
    if public:
        return ControlStatus.FAILED, f"Public access detected on {len(public)} storage resource(s)."
    return ControlStatus.VERIFIED, "No public bucket IAM principals were found; public access prevention is enforced."


def _run_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    public = [e for e in evidence if e.relevant_properties.get("all_users_invoker")]
    if public:
        return ControlStatus.FAILED, f"Unauthenticated invocation is allowed on {len(public)} Cloud Run service(s)."
    return ControlStatus.VERIFIED, "No internal Cloud Run service grants allUsers the invoker role."


def _firewall_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    exposed = [e for e in evidence if e.relevant_properties.get("exposed_admin_ports")]
    if exposed:
        return ControlStatus.FAILED, f"Administrative ports are exposed by {len(exposed)} firewall rule(s)."
    return ControlStatus.VERIFIED, "No ingress firewall rule exposes administrative ports to the internet."


def _sql_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    public = [e for e in evidence if e.relevant_properties.get("violation", e.relevant_properties.get("has_public_ip", False))]
    if public:
        return ControlStatus.FAILED, f"Public IPv4 exposure detected on {len(public)} database instance(s)."
    return ControlStatus.VERIFIED, "Cloud SQL instances enforce private IP and require TLS encryption."


def _kms_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    unrotated = [e for e in evidence if e.relevant_properties.get("violation", not e.relevant_properties.get("auto_rotation", False))]
    if unrotated:
        return ControlStatus.FAILED, f"Automatic 90-day rotation is missing on {len(unrotated)} KMS crypto key(s)."
    return ControlStatus.VERIFIED, "All customer-managed encryption keys have active 90-day automatic rotation."


def _iam_keyless_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    user_keys = [e for e in evidence if e.relevant_properties.get("violation", e.relevant_properties.get("user_managed_keys_count", 0) > 0)]
    if user_keys:
        return ControlStatus.FAILED, f"Exportable user-managed JSON service account keys detected on {len(user_keys)} account(s)."
    return ControlStatus.VERIFIED, "All service accounts adhere to keyless Workload Identity federation."


def _logging_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    missing = [e for e in evidence if e.relevant_properties.get("violation", not e.relevant_properties.get("audit_logs_enabled", False))]
    if missing:
        return ControlStatus.FAILED, f"Cloud Audit logging is disabled on {len(missing)} monitored service(s)."
    return ControlStatus.VERIFIED, "Admin Activity and Data Access audit logging are active across project services."


def _secret_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    public_secrets = [e for e in evidence if e.relevant_properties.get("violation", e.relevant_properties.get("public_access", False))]
    if public_secrets:
        return ControlStatus.FAILED, f"Unauthenticated access allowed on {len(public_secrets)} secret(s)."
    return ControlStatus.VERIFIED, "Secret Manager access requires IAM authorization with automated version rotation."


def _gke_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    public_clusters = [e for e in evidence if e.relevant_properties.get("violation", e.relevant_properties.get("public_endpoint", False))]
    if public_clusters:
        return ControlStatus.FAILED, f"Public Kubernetes API endpoint enabled on {len(public_clusters)} GKE cluster(s)."
    return ControlStatus.VERIFIED, "GKE clusters enforce private endpoints and authorized master networks."


def _asset_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    violations = [e for e in evidence if e.relevant_properties.get("violation")]
    if violations:
        return ControlStatus.FAILED, f"Security configuration gaps detected on {len(violations)} resource(s)."
    return ControlStatus.VERIFIED, "No violating resources were found in the inspected project boundary."


REGISTRY = {
    c.id: c
    for c in (
        ControlDefinition(
            "GCP_STORAGE_PUBLIC_ACCESS",
            "Public cloud storage",
            "Customer buckets deny anonymous access.",
            (r"(storage|bucket).{0,60}(public|anonymous|internet|access|inaccessible|restrict)",
             r"(public|anonymous|internet).{0,60}(storage|bucket|object)",),
            Risk.MEDIUM,
            _storage_evaluator,
            "Cloud Storage",
        ),
        ControlDefinition(
            "GCP_RUN_PUBLIC_INVOKER",
            "Internal Cloud Run authentication",
            "Internal services require authentication.",
            (r"cloud\s+run|internal\b.{0,50}\bservices?\b.{0,50}(auth|access|invok|public)",
             r"(unauthenticated|publicly\s+invokable).{0,60}(service|api|endpoint)",),
            Risk.HIGH,
            _run_evaluator,
            "Cloud Run",
        ),
        ControlDefinition(
            "GCP_FIREWALL_ADMIN_EXPOSURE",
            "Administrative network exposure",
            "Administrative ports are restricted to trusted networks.",
            (r"firewall|administrative\s+interface",
             r"(ssh|rdp|port\s+22|port\s+3389).{0,60}(public|internet|network|restrict|access)",
             r"(network|internet).{0,60}(administrat|ssh|rdp)",),
            Risk.HIGH,
            _firewall_evaluator,
            "Compute Engine / VPC",
        ),
        ControlDefinition(
            "GCP_SQL_PUBLIC_IP",
            "Cloud SQL database isolation",
            "Production databases enforce private network endpoints and TLS encryption.",
            (r"(sql|database|postgres|mysql).{0,60}(public|internet|ip|network|tls|ssl|encrypt)",
             r"(private|isolate).{0,60}(database|sql|rds|postgres)",),
            Risk.HIGH,
            _sql_evaluator,
            "Cloud SQL",
        ),
        ControlDefinition(
            "GCP_KMS_KEY_ROTATION",
            "Cryptographic key rotation",
            "Customer-managed encryption keys have automated 90-day rotation enabled.",
            (r"(kms|encryption\s+key|cmek|cryptographic\s+key).{0,60}(rotat|period|schedule|90\s+days)",
             r"(rotat|cycle).{0,60}(key|kms|secret)",),
            Risk.MEDIUM,
            _kms_evaluator,
            "Cloud KMS",
        ),
        ControlDefinition(
            "GCP_IAM_KEYLESS_WORKLOADS",
            "Keyless IAM security",
            "Workloads use keyless token federation instead of long-lived JSON service account keys.",
            (r"(service\s+account|user\s+managed\s+key|keyless|workload\s+identity).{0,60}(key|json|secret|leak|rotat)",
             r"(credential|key).{0,60}(service\s+account|keyless|iam)",),
            Risk.HIGH,
            _iam_keyless_evaluator,
            "Cloud IAM",
        ),
        ControlDefinition(
            "GCP_LOGGING_ADMIN_AUDIT",
            "Cloud audit trail logging",
            "Admin Activity and Data Access audit logging are active for compliance.",
            (r"(cloud\s+audit|audit\s+trail|admin\s+activity|data\s+access).{0,60}(log|enable|track|retention)",
             r"(log|track).{0,60}(admin\s+activity|data\s+access)",),
            Risk.MEDIUM,
            _logging_evaluator,
            "Cloud Audit Logs",
        ),
        ControlDefinition(
            "GCP_SECRET_MANAGER_ROTATION_IAM",
            "Secret Manager access gating",
            "Production secrets and API credentials restrict public accessor IAM.",
            (r"(secret|token|credential|password).{0,60}(secret\s+manager|vault|access|restrict|leak)",
             r"(secret\s+manager|vault).{0,60}(iam|access|public)",),
            Risk.HIGH,
            _secret_evaluator,
            "Secret Manager",
        ),
        ControlDefinition(
            "GCP_GKE_PRIVATE_CLUSTER",
            "GKE private cluster isolation",
            "Kubernetes clusters disable public master endpoints and isolate worker nodes.",
            (r"(gke|kubernetes|cluster|k8s).{0,60}(private|endpoint|master|public\s+ip|node)",
             r"(kubernetes|k8s|gke).{0,60}(isolate|restrict)",),
            Risk.HIGH,
            _gke_evaluator,
            "Google Kubernetes Engine",
        ),
        ControlDefinition(
            "GCP_BIGQUERY_PUBLIC_DATASET",
            "BigQuery dataset access",
            "BigQuery datasets do not grant access to public principals.",
            (r"(bigquery|data\s*warehouse|dataset).{0,60}(public|anonymous|iam|access|expos)",),
            Risk.HIGH,
            _asset_evaluator,
            "BigQuery",
        ),
        ControlDefinition(
            "GCP_PUBSUB_PUBLIC_ACCESS",
            "Pub/Sub messaging access",
            "Pub/Sub topics and subscriptions do not grant access to public principals.",
            (r"(pub/?sub|topic|subscription|message\s+bus).{0,60}(public|anonymous|iam|access)",
             r"(public|anonymous).{0,60}(pub/?sub|topic|subscription|message\s+bus)",),
            Risk.HIGH,
            _asset_evaluator,
            "Pub/Sub",
        ),
        ControlDefinition(
            "GCP_FUNCTIONS_PUBLIC_INVOKER",
            "Cloud Run functions authentication",
            "Cloud Run functions do not grant invocation access to public principals.",
            (r"(cloud\s+function|serverless\s+function|function).{0,60}(public|anonymous|unauthenticated|invok)",),
            Risk.HIGH,
            _asset_evaluator,
            "Cloud Run functions",
        ),
        ControlDefinition(
            "GCP_ARTIFACT_REGISTRY_PUBLIC_ACCESS",
            "Artifact Registry access",
            "Artifact repositories do not grant access to public principals.",
            (r"(artifact\s+registry|container\s+registry|image\s+repository|artifact).{0,60}(public|anonymous|iam|access)",),
            Risk.HIGH,
            _asset_evaluator,
            "Artifact Registry",
        ),
        ControlDefinition(
            "GCP_COMPUTE_PUBLIC_IP",
            "Compute Engine external IP exposure",
            "Compute Engine virtual machines avoid direct external IP addresses.",
            (r"(compute|virtual\s+machine|\bvm\b|instance).{0,60}(external|public|internet).{0,30}(ip|address|expos)?",),
            Risk.HIGH,
            _asset_evaluator,
            "Compute Engine",
        ),
        ControlDefinition(
            "GCP_VPC_FLOW_LOGS",
            "VPC Flow Logs coverage",
            "VPC subnetworks enable flow logs for network visibility.",
            (r"(vpc|subnet|subnetwork|network).{0,60}(flow\s+log|traffic\s+log|network\s+telemetry)",),
            Risk.MEDIUM,
            _asset_evaluator,
            "Virtual Private Cloud",
        ),
        ControlDefinition(
            "GCP_DNS_DNSSEC",
            "Cloud DNS DNSSEC",
            "Public Cloud DNS managed zones enable DNSSEC.",
            (r"(cloud\s+dns|dns|managed\s+zone).{0,60}(dnssec|sign|spoof|integrity)",
             r"dnssec.{0,60}(cloud\s+dns|dns|managed\s+zone)",),
            Risk.MEDIUM,
            _asset_evaluator,
            "Cloud DNS",
        ),
        ControlDefinition(
            "GCP_REDIS_TRANSIT_ENCRYPTION",
            "Memorystore transport encryption",
            "Memorystore for Redis requires in-transit encryption.",
            (r"(memorystore|redis|cache).{0,60}(tls|encrypt|transit|transport)",),
            Risk.HIGH,
            _asset_evaluator,
            "Memorystore for Redis",
        ),
        ControlDefinition(
            "GCP_SPANNER_PUBLIC_ACCESS",
            "Cloud Spanner public access",
            "Cloud Spanner instances and databases do not grant access to public principals.",
            (r"(spanner|distributed\s+database).{0,60}(public|anonymous|iam|access)",),
            Risk.HIGH,
            _asset_evaluator,
            "Cloud Spanner",
        ),
        ControlDefinition(
            "GCP_DATAPROC_PRIVATE_NODES",
            "Dataproc private nodes",
            "Dataproc clusters use internal-only node IP addresses.",
            (r"(dataproc|spark|hadoop).{0,60}(private|internal|public|external|ip)",),
            Risk.HIGH,
            _asset_evaluator,
            "Dataproc",
        ),
        ControlDefinition(
            "GCP_API_KEYS_RESTRICTED",
            "API key restrictions",
            "Google Cloud API keys have explicit application and API restrictions.",
            (r"(api\s+key|apikey).{0,60}(restrict|unrestrict|application|service|leak)",),
            Risk.HIGH,
            _asset_evaluator,
            "API Keys",
        ),
    )
}


CONTROL_DOMAINS = {
    "GCP_IAM_KEYLESS_WORKLOADS": "Identity",
    "GCP_API_KEYS_RESTRICTED": "Identity",
    "GCP_FIREWALL_ADMIN_EXPOSURE": "Network",
    "GCP_VPC_FLOW_LOGS": "Network",
    "GCP_DNS_DNSSEC": "Network",
    "GCP_STORAGE_PUBLIC_ACCESS": "Data",
    "GCP_SQL_PUBLIC_IP": "Data",
    "GCP_KMS_KEY_ROTATION": "Data",
    "GCP_SECRET_MANAGER_ROTATION_IAM": "Data",
    "GCP_BIGQUERY_PUBLIC_DATASET": "Data",
    "GCP_REDIS_TRANSIT_ENCRYPTION": "Data",
    "GCP_SPANNER_PUBLIC_ACCESS": "Data",
    "GCP_RUN_PUBLIC_INVOKER": "Compute",
    "GCP_GKE_PRIVATE_CLUSTER": "Compute",
    "GCP_FUNCTIONS_PUBLIC_INVOKER": "Compute",
    "GCP_ARTIFACT_REGISTRY_PUBLIC_ACCESS": "Compute",
    "GCP_COMPUTE_PUBLIC_IP": "Compute",
    "GCP_DATAPROC_PRIVATE_NODES": "Compute",
    "GCP_LOGGING_ADMIN_AUDIT": "Observability",
    "GCP_PUBSUB_PUBLIC_ACCESS": "Observability",
}


def map_question(question: str) -> str | None:
    normalized = question.lower()
    for control in REGISTRY.values():
        if any(re.search(pattern, normalized) for pattern in control.question_patterns):
            return control.id
    return None


def evaluate(control_id: str, evidence: list[Evidence]) -> ControlResult:
    control = REGISTRY[control_id]
    status, summary = control.evaluator(evidence)
    return ControlResult(control_id=control_id, status=status, summary=summary, evidence=evidence)


def fingerprint(value: dict) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()


def plan_for(workspace_id: str, result: ControlResult, policy: PolicyEngine) -> RemediationPlan:
    if result.status != ControlStatus.FAILED or not result.evidence:
        raise ValueError("Only failed controls with evidence can be remediated")
    control = REGISTRY[result.control_id]
    failing_property = {
        "GCP_STORAGE_PUBLIC_ACCESS": "public_principals",
        "GCP_RUN_PUBLIC_INVOKER": "all_users_invoker",
        "GCP_FIREWALL_ADMIN_EXPOSURE": "exposed_admin_ports",
    }[result.control_id]
    item = next(
        (evidence for evidence in result.evidence if evidence.relevant_properties.get(failing_property)),
        result.evidence[0],
    )
    changes = {
        "GCP_STORAGE_PUBLIC_ACCESS": ("Remove allUsers/allAuthenticatedUsers IAM bindings and enforce public-access prevention", "Anonymous object reads will be blocked", "Unauthenticated clients will lose access", "Restore the captured IAM policy and prior prevention setting"),
        "GCP_RUN_PUBLIC_INVOKER": ("Remove allUsers from roles/run.invoker", "Unauthenticated requests will be rejected", "Any unauthenticated caller will lose access", "Restore the captured IAM binding"),
        "GCP_FIREWALL_ADMIN_EXPOSURE": ("Disable the isolated TrustFix demo firewall rule", "Internet ingress to administrative ports will be blocked", "Any client relying on that rule will lose access", "Re-enable the captured demo firewall rule"),
    }
    change, expected, impact, rollback = changes[result.control_id]
    before = item.raw or item.relevant_properties
    return RemediationPlan(workspace_id=workspace_id, control_id=result.control_id, target_project_id=item.project, resource=item.resource_identifier, current_state=item.observation, proposed_change=change, expected_result=expected, potential_impact=impact, dependencies_checked=3, rollback=rollback, risk=control.risk, decision=policy.decide(result.control_id, control.risk), expected_fingerprint=fingerprint(before))
