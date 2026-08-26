from .models import Review, ReviewQuestion, Evidence, ControlStatus
from datetime import datetime, timezone


def _now() -> datetime:
    return datetime.now(timezone.utc)


def demo_review(workspace_id: str = "workspace-demo") -> Review:
    questions = [
        ReviewQuestion(
            original_row=1,
            question="Is sensitive customer storage inaccessible from the public internet?",
            control_id="GCP_STORAGE_PUBLIC_ACCESS",
            status=ControlStatus.FAILED,
            answer=None,
            evidence_ids=["ev-demo-storage-001"],
        ),
        ReviewQuestion(
            original_row=2,
            question="Are internal production services inaccessible without authentication?",
            control_id="GCP_RUN_PUBLIC_INVOKER",
            status=ControlStatus.VERIFIED,
            answer="Yes — No internal Cloud Run service grants allUsers the invoker role. Verified against live infrastructure.",
            evidence_ids=["ev-demo-run-001"],
        ),
        ReviewQuestion(
            original_row=3,
            question="Are administrative interfaces restricted from untrusted networks?",
            control_id="GCP_FIREWALL_ADMIN_EXPOSURE",
            status=ControlStatus.VERIFIED,
            answer="Yes — No ingress firewall rule exposes administrative ports to the internet. Verified against live infrastructure.",
            evidence_ids=["ev-demo-firewall-001"],
        ),
        ReviewQuestion(
            original_row=4,
            question="Do all employees complete annual phishing training?",
            control_id=None,
            status=ControlStatus.UNSUPPORTED,
            answer="Needs review — TrustFix cannot verify this requirement from the currently connected Google Cloud environment.",
            evidence_ids=[],
        ),
    ]
    review = Review(
        id=f"review-demo-{workspace_id.removeprefix('workspace-')}",
        workspace_id=workspace_id,
        name="Acme Corp Security Review",
        status="Needs attention",
        questions=questions,
    )
    return review


def demo_evidence(workspace_id: str = "workspace-demo") -> list[Evidence]:
    """Pre-seeded illustrative evidence records for the demo workspace."""
    return [
        Evidence(
            id="ev-demo-storage-001",
            workspace_id=workspace_id,
            control_id="GCP_STORAGE_PUBLIC_ACCESS",
            source="Google Cloud Storage IAM",
            project="trustfix-demo-target",
            resource="trustfix-public-storage-demo",
            resource_identifier="gs://trustfix-public-storage-demo",
            observation="Public principals have bucket access.",
            relevant_properties={
                "public_principals": [{"role": "roles/storage.objectViewer", "members": ["allUsers"]}],
                "public_access_prevention": "inherited",
            },
            raw={"bindings": [{"role": "roles/storage.objectViewer", "members": ["allUsers"]}]},
            live=False,
            collector="trustfix-scanner-demo",
            verification_status="COLLECTED",
        ),
        Evidence(
            id="ev-demo-run-001",
            workspace_id=workspace_id,
            control_id="GCP_RUN_PUBLIC_INVOKER",
            source="Cloud Run IAM",
            project="trustfix-demo-target",
            resource="trustfix-internal-api",
            resource_identifier="projects/trustfix-demo-target/locations/us-central1/services/trustfix-internal-api",
            observation="No public invoker binding.",
            relevant_properties={"all_users_invoker": False},
            raw={"all_users_invoker": False},
            live=False,
            collector="trustfix-scanner-demo",
            verification_status="VERIFIED",
        ),
        Evidence(
            id="ev-demo-firewall-001",
            workspace_id=workspace_id,
            control_id="GCP_FIREWALL_ADMIN_EXPOSURE",
            source="Compute Engine Firewall API",
            project="trustfix-demo-target",
            resource="default-allow-internal",
            resource_identifier="default-allow-internal",
            observation="No public administrative port exposure.",
            relevant_properties={"exposed_admin_ports": [], "source_ranges": ["10.128.0.0/9"], "disabled": False},
            raw={"exposed_admin_ports": [], "source_ranges": ["10.128.0.0/9"], "disabled": False},
            live=False,
            collector="trustfix-scanner-demo",
            verification_status="VERIFIED",
        ),
    ]
