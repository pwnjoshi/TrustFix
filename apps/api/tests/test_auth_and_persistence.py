from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.auth import Identity, provision_user, verify_identity
from app.config import Settings
from app.models import Role, Workspace, WorkspaceInvitation
from app.store import MemoryStore


def test_dev_identity_provisions_tenant(monkeypatch):
    import app.auth as auth

    memory = MemoryStore()
    monkeypatch.setattr(auth, "store", memory)
    user = provision_user(Identity("subject-1", "owner@example.com", "Owner"))
    assert user.role == Role.OWNER
    assert memory.get("workspaces", user.workspace_id).name == "Owner's TrustFix workspace"
    assert memory.get("workspace_members", f"{user.workspace_id}:{user.id}").user_id == user.id


def test_production_rejects_missing_iap_assertion():
    settings = Settings(auth_mode="iap", trustfix_iap_audience="/projects/1/locations/r/services/web")
    request = SimpleNamespace(headers={})
    with pytest.raises(HTTPException) as error:
        verify_identity(request, settings)
    assert error.value.status_code == 401


def test_invited_user_joins_existing_workspace(monkeypatch):
    import app.auth as auth

    memory = MemoryStore()
    workspace = Workspace(id="workspace-team", name="TrustFix team")
    invitation = WorkspaceInvitation(workspace_id=workspace.id, email="reviewer@example.com", role=Role.REVIEWER, invited_by="owner")
    memory.put("workspaces", workspace.id, workspace)
    memory.put("workspace_invitations", invitation.id, invitation)
    monkeypatch.setattr(auth, "store", memory)
    user = provision_user(Identity("reviewer-subject", invitation.email, "Reviewer"))
    assert user.workspace_id == workspace.id
    assert user.role == Role.REVIEWER
    assert memory.get("workspace_invitations", invitation.id).status == "Accepted"


def test_dev_auth_cannot_run_on_cloud_run(monkeypatch):
    monkeypatch.setenv("K_SERVICE", "trustfix-api")
    with pytest.raises(HTTPException) as error:
        verify_identity(SimpleNamespace(headers={}), Settings(auth_mode="dev"))
    assert error.value.status_code == 500


def test_default_firestore_database_is_not_passed_as_literal(monkeypatch):
    import app.store as store_module

    captured = {}
    monkeypatch.setenv("TRUSTFIX_PLATFORM_PROJECT_ID", "platform")
    monkeypatch.setenv("FIRESTORE_DATABASE", "(default)")
    fake = SimpleNamespace(project="platform", _database_string="projects/platform/databases/%28default%29", _database_string_internal=None)
    monkeypatch.setattr(store_module.firestore, "Client", lambda **kwargs: captured.update(kwargs) or fake)
    store_module.FirestoreStore()
    assert captured == {"project": "platform"}
    assert fake._database_string_internal == "projects/platform/databases/(default)"
