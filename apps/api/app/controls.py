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
    public = [e for e in evidence if e.relevant_properties.get("has_public_ip")]
    if public:
        return ControlStatus.FAILED, f"Public IPv4 exposure detected on {len(public)} database instance(s)."
    return ControlStatus.VERIFIED, "Cloud SQL instances enforce private IP and require TLS encryption."


def _kms_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    unrotated = [e for e in evidence if not e.relevant_properties.get("auto_rotation")]
    if unrotated:
        return ControlStatus.FAILED, f"Automatic 90-day rotation is missing on {len(unrotated)} KMS crypto key(s)."
    return ControlStatus.VERIFIED, "All customer-managed encryption keys have active 90-day automatic rotation."


def _iam_keyless_evaluator(evidence: list[Evidence]) -> tuple[ControlStatus, str]:
    user_keys = [e for e in evidence if e.relevant_properties.get("user_managed_keys_count", 0) > 0]
    if user_keys:
        return ControlStatus.FAILED, f"Exportable user-managed JSON service account keys detected on {len(user_keys)} account(s)."
    return ControlStatus.VERIFIED, "All service accounts adhere to keyless Workload Identity federation."


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
        ),
        ControlDefinition(
            "GCP_RUN_PUBLIC_INVOKER",
            "Internal Cloud Run authentication",
            "Internal services require authentication.",
            (r"cloud\s+run|internal\b.{0,50}\bservices?\b.{0,50}(auth|access|invok|public)",
             r"(unauthenticated|publicly\s+invokable).{0,60}(service|api|endpoint)",),
            Risk.HIGH,
            _run_evaluator,
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
        ),
        ControlDefinition(
            "GCP_SQL_PUBLIC_IP",
            "Cloud SQL database isolation",
            "Production databases enforce private network endpoints and TLS encryption.",
            (r"(sql|database|postgres|mysql).{0,60}(public|internet|ip|network|tls|ssl|encrypt)",
             r"(private|isolate).{0,60}(database|sql|rds|postgres)",),
            Risk.HIGH,
            _sql_evaluator,
        ),
        ControlDefinition(
            "GCP_KMS_KEY_ROTATION",
            "Cryptographic key rotation",
            "Customer-managed encryption keys have automated 90-day rotation enabled.",
            (r"(kms|encryption\s+key|cmek|cryptographic\s+key).{0,60}(rotat|period|schedule|90\s+days)",
             r"(rotat|cycle).{0,60}(key|kms|secret)",),
            Risk.MEDIUM,
            _kms_evaluator,
        ),
        ControlDefinition(
            "GCP_IAM_KEYLESS_WORKLOADS",
            "Keyless IAM security",
            "Workloads use keyless token federation instead of long-lived JSON service account keys.",
            (r"(service\s+account|user\s+managed\s+key|keyless|workload\s+identity).{0,60}(key|json|secret|leak|rotat)",
             r"(credential|key).{0,60}(service\s+account|keyless|iam)",),
            Risk.HIGH,
            _iam_keyless_evaluator,
        ),
    )
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
