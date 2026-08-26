import base64
import json
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request

from .config import get_settings
from .gcp import GcpControlAdapter
from .models import ActivityEvent, ControlStatus
from .orchestrator import ReviewOrchestrator
from .store import store


settings = get_settings()
app = FastAPI(title="TrustFix Worker", docs_url=None, redoc_url=None)
logger = logging.getLogger("trustfix.worker")


def _payload(envelope: dict) -> dict:
    try:
        encoded = envelope["message"]["data"]
        return json.loads(base64.b64decode(encoded).decode())
    except (KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(400, "Malformed Pub/Sub message") from exc


@app.get("/health")
def health():
    return {"status": "ok", "service": "trustfix-worker"}


@app.post("/internal/pubsub/scan", status_code=204)
async def scan(request: Request):
    if settings.trustfix_worker_role not in {"all", "scanner"}:
        raise HTTPException(403, "This worker is not authorized to scan")
    data = _payload(await request.json())
    job = store.get("jobs", data["job_id"])
    if not job or job.status == "SUCCEEDED":
        return
    review = store.get("reviews", data["review_id"])
    if not review or review.workspace_id != data["workspace_id"]:
        raise HTTPException(404, "Review not found")
    try:
        job.status = "RUNNING"
        job.phase = "Inspecting Google Cloud"
        job.progress = 20
        job.updated_at = datetime.now(timezone.utc)
        store.put("jobs", job.id, job)
        workspace = store.get("workspaces", review.workspace_id)
        target_project_id = (workspace.target_project_id if workspace else None) or settings.trustfix_target_project_id
        if not target_project_id:
            raise RuntimeError("Workspace Google Cloud target is not configured")
        ReviewOrchestrator(settings, target_project_id).run(review)
        job.status = "SUCCEEDED"
        job.phase = "Evidence verified"
        job.progress = 100
        logger.info(json.dumps({"event": "scan_completed", "run_id": job.id, "workspace_id": job.workspace_id, "review_id": job.review_id}))
    except Exception as exc:
        job.status = "FAILED"
        job.phase = "Inspection failed"
        job.error = f"{type(exc).__name__}: {exc}"
        logger.exception("scan_failed", extra={"run_id": job.id, "workspace_id": job.workspace_id, "review_id": job.review_id})
    finally:
        job.updated_at = datetime.now(timezone.utc)
        store.put("jobs", job.id, job)


@app.post("/internal/pubsub/remediate", status_code=204)
async def remediate(request: Request):
    if settings.trustfix_worker_role not in {"all", "remediator"}:
        raise HTTPException(403, "This worker is not authorized to remediate")
    data = _payload(await request.json())
    job = store.get("jobs", data["job_id"])
    if not job or job.status == "SUCCEEDED":
        return
    plan = store.get("remediation_plans", data["plan_id"])
    approval = store.get("approvals", data["approval_id"])
    if not plan or not approval or approval.decision != "APPROVED" or plan.workspace_id != data["workspace_id"]:
        if job:
            job.status = "FAILED"
            job.phase = "Approval validation failed safely"
            job.error = "A valid persisted approval is required"
            job.updated_at = datetime.now(timezone.utc)
            store.put("jobs", job.id, job)
        logger.error(json.dumps({"event": "remediation_rejected", "run_id": data.get("job_id"), "reason": "invalid_approval"}))
        return
    if plan.control_id != "GCP_STORAGE_PUBLIC_ACCESS":
        job.status = "FAILED"
        job.phase = "Unsupported mutation refused safely"
        job.error = f"No mutation executor is enabled for {plan.control_id}"
        job.updated_at = datetime.now(timezone.utc)
        store.put("jobs", job.id, job)
        logger.warning(json.dumps({"event": "remediation_refused", "run_id": job.id, "control_id": plan.control_id}))
        return
    try:
        job.status = "RUNNING"
        job.phase = "Checking approval and drift"
        job.progress = 15
        store.put("jobs", job.id, job)
        workspace = store.get("workspaces", job.workspace_id)
        target_project_id = (workspace.target_project_id if workspace else None) or settings.trustfix_target_project_id
        if not target_project_id:
            raise RuntimeError("Workspace Google Cloud target is not configured")
        adapter = GcpControlAdapter(target_project_id)
        before = {"resource": plan.resource, "fingerprint": plan.expected_fingerprint}
        execution = adapter.remediate_storage(plan.resource, plan.expected_fingerprint)
        job.phase = "Verifying anonymous access"
        job.progress = 70
        store.put("jobs", job.id, job)
        anonymous_status = await adapter.anonymous_storage_probe(plan.resource)
        if anonymous_status not in {401, 403, 404}:
            raise RuntimeError(f"Verification failed: anonymous request returned HTTP {anonymous_status}")
        review = store.get("reviews", data["review_id"])
        for question in review.questions:
            if question.control_id == plan.control_id:
                question.status = ControlStatus.VERIFIED
                question.answer = "Yes. Production storage denies unauthenticated public access. Verified against Google Cloud IAM and an anonymous access test."
        review.status = "Needs attention" if any(item.status in {ControlStatus.FAILED, ControlStatus.NEEDS_REVIEW, ControlStatus.UNSUPPORTED} for item in review.questions) else "Ready"
        review.updated_at = datetime.now(timezone.utc)
        store.put("reviews", review.id, review)
        event = ActivityEvent(workspace_id=job.workspace_id, review_id=review.id, actor="TrustFix remediator", action="Remediation verified", resource=plan.resource, result=f"Anonymous HTTP {anonymous_status}; before={before}; after={execution}")
        store.put("activity_events", event.id, event)
        store.put("remediation_actions", job.id, {"plan_id": plan.id, "before": before, "after": execution, "anonymous_status": anonymous_status, "status": "VERIFIED"})
        job.status = "SUCCEEDED"
        job.phase = "Remediation independently verified"
        job.progress = 100
        logger.info(json.dumps({"event": "remediation_verified", "run_id": job.id, "workspace_id": job.workspace_id, "review_id": job.review_id, "control_id": plan.control_id}))
    except Exception as exc:
        job.status = "FAILED"
        job.phase = "Remediation failed safely"
        job.error = f"{type(exc).__name__}: {exc}"
        logger.exception("remediation_failed", extra={"run_id": job.id, "workspace_id": job.workspace_id, "review_id": job.review_id, "control_id": plan.control_id})
    finally:
        job.updated_at = datetime.now(timezone.utc)
        store.put("jobs", job.id, job)
