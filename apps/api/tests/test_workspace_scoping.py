from types import SimpleNamespace

from app.models import AuthenticatedUser, ControlStatus, Review, ReviewQuestion, Role, Workspace, now
from app.store import MemoryStore


def test_control_status_comes_only_from_current_workspace_and_target(monkeypatch):
    import app.main as main

    memory = MemoryStore()
    user = AuthenticatedUser(id="user-a", email="a@example.com", display_name="A", workspace_id="workspace-a", role=Role.OWNER)
    workspace = Workspace(id=user.workspace_id, name="A", target_project_id="project-a", target_verified_project_id="project-a", target_verified_at=now(), onboarding_complete=True)
    current = Review(workspace_id=user.workspace_id, target_project_id="project-a", name="Current", questions=[ReviewQuestion(question="Storage", control_id="GCP_STORAGE_PUBLIC_ACCESS", status=ControlStatus.VERIFIED)])
    unrelated = Review(workspace_id="workspace-b", target_project_id="project-b", name="Other tenant", questions=[ReviewQuestion(question="Storage", control_id="GCP_STORAGE_PUBLIC_ACCESS", status=ControlStatus.FAILED)])
    memory.put("workspaces", workspace.id, workspace)
    memory.put("reviews", current.id, current)
    memory.put("reviews", unrelated.id, unrelated)
    monkeypatch.setattr(main, "store", memory)
    monkeypatch.setattr(main, "current_user", lambda request: user)

    controls = main.list_controls(SimpleNamespace())
    storage = next(item for item in controls if item["id"] == "GCP_STORAGE_PUBLIC_ACCESS")
    assert storage["last_status"] == "VERIFIED"
