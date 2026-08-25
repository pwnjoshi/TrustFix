import hashlib
import os
from dataclasses import dataclass

from fastapi import HTTPException, Request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .config import Settings
from .models import AuthenticatedUser, Role, User, Workspace, WorkspaceMember
from .store import store


@dataclass(frozen=True)
class Identity:
    subject: str
    email: str
    display_name: str


def _stable_id(prefix: str, value: str) -> str:
    return f"{prefix}-{hashlib.sha256(value.encode()).hexdigest()[:20]}"


def verify_identity(request: Request, settings: Settings) -> Identity:
    if settings.auth_mode == "dev":
        if os.environ.get("K_SERVICE"):
            raise HTTPException(500, "Development authentication is disabled on Cloud Run")
        email = settings.trustfix_dev_user_email
        return Identity(email, email, email.split("@", 1)[0])
    if settings.auth_mode != "iap" or not settings.trustfix_iap_audience:
        raise HTTPException(503, "Production authentication is not configured")
    assertion = request.headers.get("X-TrustFix-IAP-JWT")
    if not assertion:
        raise HTTPException(401, "Sign in with Google to continue")
    try:
        claims = id_token.verify_token(assertion, google_requests.Request(), audience=settings.trustfix_iap_audience, certs_url="https://www.gstatic.com/iap/verify/public_key")
    except ValueError as exc:
        raise HTTPException(401, "Invalid or expired login session") from exc
    email = str(claims.get("email", "")).lower()
    if not email or not claims.get("sub"):
        raise HTTPException(401, "Google identity is missing required claims")
    return Identity(str(claims["sub"]), email, str(claims.get("name") or email.split("@", 1)[0]))


def provision_user(identity: Identity) -> AuthenticatedUser:
    user_id = _stable_id("user", identity.subject)
    user = store.get("users", user_id)
    invitation = next((item for item in store.list("workspace_invitations") if item.email == identity.email and item.status != "Accepted"), None)
    workspace_id = invitation.workspace_id if invitation else _stable_id("workspace", identity.subject)
    if not user:
        user = User(id=user_id, email=identity.email, display_name=identity.display_name)
        store.put("users", user_id, user)
    member = store.get("workspace_members", f"{workspace_id}:{user_id}")
    if not member:
        if invitation:
            member = WorkspaceMember(id=f"{workspace_id}:{user_id}", workspace_id=workspace_id, user_id=user_id, role=invitation.role)
            invitation.status = "Accepted"
            store.put("workspace_invitations", invitation.id, invitation)
        else:
            workspace = Workspace(id=workspace_id, name=f"{identity.display_name}'s TrustFix workspace")
            member = WorkspaceMember(id=f"{workspace_id}:{user_id}", workspace_id=workspace_id, user_id=user_id, role=Role.OWNER)
            store.put("workspaces", workspace_id, workspace)
        store.put("workspace_members", member.id, member)
    member = store.get("workspace_members", f"{workspace_id}:{user_id}")
    return AuthenticatedUser(id=user_id, email=user.email, display_name=user.display_name, workspace_id=workspace_id, role=member.role)


def current_user(request: Request) -> AuthenticatedUser:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(401, "Authentication required")
    return user
