import json
from types import SimpleNamespace

from app.models import ActivityEvent, AuthenticatedUser, ControlStatus, Evidence, Job, Review, ReviewQuestion, Role, Workspace, now
from app.store import MemoryStore


def _workspace(memory: MemoryStore):
    user = AuthenticatedUser(id="user-1", email="owner@example.com", display_name="Owner", workspace_id="workspace-1", role=Role.OWNER)
    workspace = Workspace(id=user.workspace_id, name="Acme workspace", target_project_id="trustfix-demo-target", target_verified_project_id="trustfix-demo-target", target_verified_at=now(), onboarding_complete=True)
    review = Review(id="review-1", workspace_id=user.workspace_id, target_project_id="trustfix-demo-target", name="Customer review", questions=[
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


def test_full_project_scan_queues_every_registered_control(monkeypatch):
    import app.main as main
    from app.controls import REGISTRY

    memory = MemoryStore()
    user, _ = _workspace(memory)
    monkeypatch.setattr(main, "store", memory)
    monkeypatch.setattr(main, "current_user", lambda request: user)
    monkeypatch.setattr(main, "publish", lambda settings, topic, payload: "message-1")

    payload = main.start_full_project_scan(SimpleNamespace())
    review = memory.get("reviews", payload["review_id"])

    assert payload["control_count"] == len(REGISTRY) == 20
    assert {question.control_id for question in review.questions} == set(REGISTRY)
    assert memory.get("jobs", payload["job_id"]).kind == "FULL_SCAN"


def test_command_center_groups_full_posture_by_domain(monkeypatch):
    import app.main as main
    from app.controls import REGISTRY

    memory = MemoryStore()
    user, _ = _workspace(memory)
    full_review = Review(
        id="full-review",
        workspace_id=user.workspace_id,
        target_project_id="trustfix-demo-target",
        name="Full Google Cloud Posture Scan",
        status="Needs attention",
        questions=[ReviewQuestion(question=definition.description, control_id=control_id, status=ControlStatus.VERIFIED) for control_id, definition in REGISTRY.items()],
    )
    memory.put("reviews", full_review.id, full_review)
    monkeypatch.setattr(main, "store", memory)
    monkeypatch.setattr(main, "current_user", lambda request: user)

    payload = main.command_center(SimpleNamespace())

    assert [domain["name"] for domain in payload["posture_domains"]] == ["Identity", "Network", "Data", "Compute", "Observability"]
    assert sum(domain["total"] for domain in payload["posture_domains"]) == 20
    assert all(domain["score"] == 100 for domain in payload["posture_domains"])
    assert payload["demo_flow"][0]["status"] == "COMPLETE"


def test_proof_pack_contains_verifiable_sha256_integrity(monkeypatch):
    import hashlib
    import app.main as main

    memory = MemoryStore()
    user, review = _workspace(memory)
    monkeypatch.setattr(main, "store", memory)
    monkeypatch.setattr(main, "current_user", lambda request: user)

    response = main.export_proof_pack(review.id, SimpleNamespace())
    payload = json.loads(response.body)
    integrity = payload.pop("integrity")
    expected = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

    assert integrity["algorithm"] == "SHA-256"
    assert integrity["digest"] == expected


def test_command_center_hides_stale_data_when_target_is_not_verified(monkeypatch):
    import app.main as main

    memory = MemoryStore()
    user, review = _workspace(memory)
    workspace = memory.get("workspaces", user.workspace_id)
    workspace.target_project_id = "different-project"
    memory.put("workspaces", workspace.id, workspace)
    memory.put("evidence", "old", Evidence(id="old", workspace_id=user.workspace_id, control_id="GCP_STORAGE_PUBLIC_ACCESS", source="test", project="trustfix-demo-target", resource="bucket", resource_identifier="gs://bucket", observation="private", live=True))
    monkeypatch.setattr(main, "store", memory)
    monkeypatch.setattr(main, "current_user", lambda request: user)

    payload = main.command_center(SimpleNamespace())
    assert payload["connection_status"] == "VERIFICATION_REQUIRED"
    assert payload["connection_verified"] is False
    assert payload["latest_review"] is None
    assert payload["evidence_count"] == 0
    assert payload["pending_approvals"] == 0
