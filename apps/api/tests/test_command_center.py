from types import SimpleNamespace

from app.models import ActivityEvent, AuthenticatedUser, ControlStatus, Evidence, Job, Review, ReviewQuestion, Role, Workspace
from app.store import MemoryStore


def _workspace(memory: MemoryStore):
    user = AuthenticatedUser(id="user-1", email="owner@example.com", display_name="Owner", workspace_id="workspace-1", role=Role.OWNER)
    workspace = Workspace(id=user.workspace_id, name="Acme workspace", target_project_id="trustfix-demo-target", onboarding_complete=True)
    review = Review(id="review-1", workspace_id=user.workspace_id, name="Customer review", questions=[
        ReviewQuestion(question="Is storage private?", status=ControlStatus.VERIFIED),
        ReviewQuestion(question="Is Cloud Run private?", status=ControlStatus.FAILED),
    ])
    memory.put("workspaces", workspace.id, workspace)
    memory.put("reviews", review.id, review)
    return user, review


def test_command_center_aggregates_workspace_state(monkeypatch):
    import app.main as main

    memory = MemoryStore()
    user, review = _workspace(memory)
    memory.put("jobs", "job-1", Job(id="job-1", workspace_id=user.workspace_id, review_id=review.id, kind="SCAN", status="RUNNING", phase="Inspecting", progress=30))
    memory.put("evidence", "evidence-1", Evidence(id="evidence-1", workspace_id=user.workspace_id, control_id="GCP_STORAGE_PUBLIC_ACCESS", source="test", project="trustfix-demo-target", resource="bucket", resource_identifier="gs://bucket", observation="private", live=True))
    memory.put("activity_events", "event-1", ActivityEvent(id="event-1", workspace_id=user.workspace_id, review_id=review.id, actor="TrustFix", action="Control checked", resource="bucket", result="Verified"))
    monkeypatch.setattr(main, "store", memory)
    monkeypatch.setattr(main, "current_user", lambda request: user)

    payload = main.command_center(SimpleNamespace())
    assert payload["target_project"] == "trustfix-demo-target"
    assert payload["assurance_score"] == 50
    assert payload["verified_controls"] == 1
    assert payload["failed_controls"] == 1
    assert payload["live_evidence_count"] == 1
    assert payload["jobs"][0].phase == "Inspecting"


def test_job_defaults_are_mission_control_ready():
    job = Job(workspace_id="workspace", review_id="review", kind="SCAN")
    assert job.phase == "Queued"
    assert job.progress == 0
