import base64
import json
from types import SimpleNamespace

import pytest

from app.models import Approval, Job, PolicyDecision, RemediationPlan, Risk
from app.store import MemoryStore


class Request:
    def __init__(self, payload):
        self.payload = payload

    async def json(self):
        return self.payload


def envelope(payload: dict) -> dict:
    encoded = base64.b64encode(json.dumps(payload).encode()).decode()
    return {"message": {"data": encoded}}


@pytest.mark.asyncio
async def test_unsupported_remediation_is_acked_and_recorded(monkeypatch):
    import app.worker as worker

    memory = MemoryStore()
    job = Job(id="job-1", workspace_id="workspace-1", review_id="review-1", kind="REMEDIATE")
    plan = RemediationPlan(
        id="plan-1", workspace_id=job.workspace_id, review_id=job.review_id,
        control_id="GCP_RUN_PUBLIC_INVOKER", resource="service", current_state="public",
        proposed_change="remove allUsers", expected_result="private", potential_impact="access changes",
        dependencies_checked=1, rollback="restore binding", risk=Risk.HIGH,
        decision=PolicyDecision.REQUIRE_APPROVAL, expected_fingerprint="fingerprint",
    )
    approval = Approval(id="approval-1", workspace_id=job.workspace_id, plan_id=plan.id, user_id="user-1", decision="APPROVED")
    memory.put("jobs", job.id, job)
    memory.put("remediation_plans", plan.id, plan)
    memory.put("approvals", approval.id, approval)
    monkeypatch.setattr(worker, "store", memory)
    monkeypatch.setattr(worker, "settings", SimpleNamespace(trustfix_worker_role="remediator"))

    result = await worker.remediate(Request(envelope({"job_id": job.id, "plan_id": plan.id, "approval_id": approval.id, "workspace_id": job.workspace_id, "review_id": job.review_id})))

    assert result is None
    persisted = memory.get("jobs", job.id)
    assert persisted.status == "FAILED"
    assert persisted.phase == "Unsupported mutation refused safely"
