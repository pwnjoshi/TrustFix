"""Exercise the deployed Pub/Sub workers against the disposable target."""

import json
import os
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))
os.environ.update({
    "TRUSTFIX_PLATFORM_PROJECT_ID": "trustfix-506602",
    "TRUSTFIX_TARGET_PROJECT_ID": "trustfix-demo-target",
    "FIRESTORE_DATABASE": "(default)",
    "STORE_BACKEND": "firestore",
    "PREVIEW_MODE": "false",
})

from app.config import get_settings  # noqa: E402
from app.jobs import publish  # noqa: E402
from app.models import Approval, Job  # noqa: E402
from app.seed import demo_review  # noqa: E402
from app.store import store  # noqa: E402


def wait_for(job_id: str, timeout: int = 180) -> Job:
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = store.get("jobs", job_id)
        if job.status in {"SUCCEEDED", "FAILED"}:
            return job
        time.sleep(2)
    raise TimeoutError(f"Job {job_id} did not finish")


def main() -> None:
    settings = get_settings()
    if settings.trustfix_target_project_id != "trustfix-demo-target":
        raise RuntimeError("Acceptance refused outside trustfix-demo-target")
    workspace_id = "workspace-deployed-acceptance"
    review = demo_review()
    review.id = "review-deployed-acceptance"
    review.workspace_id = workspace_id
    store.put("reviews", review.id, review)
    scan = Job(workspace_id=workspace_id, review_id=review.id, kind="SCAN")
    store.put("jobs", scan.id, scan)
    publish(settings, settings.pubsub_scan_topic, {"job_id": scan.id, "review_id": review.id, "workspace_id": workspace_id})
    scan = wait_for(scan.id)
    if scan.status != "SUCCEEDED":
        raise RuntimeError(scan.error)
    plans = sorted((plan for plan in store.list("remediation_plans") if plan.review_id == review.id and plan.control_id == "GCP_STORAGE_PUBLIC_ACCESS"), key=lambda item: item.created_at, reverse=True)
    if not plans:
        raise RuntimeError("The deployed scanner did not create a storage remediation plan")
    plan = plans[0]
    approval = Approval(workspace_id=workspace_id, plan_id=plan.id, user_id="acceptance-owner", decision="APPROVED")
    remediation = Job(workspace_id=workspace_id, review_id=review.id, kind="REMEDIATE")
    store.put("approvals", approval.id, approval)
    store.put("jobs", remediation.id, remediation)
    publish(settings, settings.pubsub_remediation_topic, {"job_id": remediation.id, "review_id": review.id, "workspace_id": workspace_id, "plan_id": plan.id, "approval_id": approval.id})
    remediation = wait_for(remediation.id)
    if remediation.status != "SUCCEEDED":
        raise RuntimeError(remediation.error)
    result = store.get("remediation_actions", remediation.id)
    print(json.dumps({"scan_job": scan.status, "remediation_job": remediation.status, "control": plan.control_id, "resource": plan.resource, "anonymous_status": result["anonymous_status"], "result": result["status"]}, indent=2))


if __name__ == "__main__":
    main()
