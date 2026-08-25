from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


def now() -> datetime:
    return datetime.now(timezone.utc)


class Role(StrEnum):
    OWNER = "Owner"
    ADMIN = "Admin"
    REVIEWER = "Security Reviewer"
    VIEWER = "Viewer"


class ControlStatus(StrEnum):
    VERIFIED = "VERIFIED"
    FAILED = "FAILED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    UNSUPPORTED = "UNSUPPORTED"
    REMEDIATING = "REMEDIATING"


class Risk(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PolicyDecision(StrEnum):
    AUTO_REMEDIATE = "AUTO_REMEDIATE"
    REQUIRE_APPROVAL = "REQUIRE_APPROVAL"
    MANUAL_ONLY = "MANUAL_ONLY"


class Evidence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    control_id: str
    source: str
    project: str
    resource: str
    resource_identifier: str
    observation: str
    relevant_properties: dict[str, Any] = Field(default_factory=dict)
    raw: dict[str, Any] = Field(default_factory=dict)
    collected_at: datetime = Field(default_factory=now)
    collector: str = "trustfix-scanner"
    verification_status: str = "COLLECTED"
    live: bool = False


class Interpretation(BaseModel):
    question: str
    security_domain: str
    assertion: str
    controls: list[str]
    required_evidence: list[str]
    confidence: float = Field(ge=0, le=1)


class ControlResult(BaseModel):
    control_id: str
    status: ControlStatus
    summary: str
    evidence: list[Evidence] = Field(default_factory=list)
    missing_permission: str | None = None
    checked_at: datetime = Field(default_factory=now)


class RemediationPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    review_id: str | None = None
    control_id: str
    resource: str
    current_state: str
    proposed_change: str
    expected_result: str
    potential_impact: str
    dependencies_checked: int
    rollback: str
    risk: Risk
    decision: PolicyDecision
    expected_fingerprint: str
    created_at: datetime = Field(default_factory=now)


class ReviewQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    original_row: int = 1
    question: str
    control_id: str | None = None
    status: ControlStatus | None = None
    answer: str | None = None
    evidence_ids: list[str] = Field(default_factory=list)


class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    name: str
    status: str = "Draft"
    questions: list[ReviewQuestion]
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class ActivityEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    review_id: str
    actor: str
    action: str
    resource: str
    result: str
    timestamp: datetime = Field(default_factory=now)


class RemediationRequest(BaseModel):
    plan_id: str
    idempotency_key: str = Field(min_length=8, max_length=128)
    approved: bool


class User(BaseModel):
    id: str
    email: str
    display_name: str
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class Workspace(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    organization_name: str | None = None
    primary_use_case: str | None = None
    target_project_id: str | None = None
    target_boundary_confirmed: bool = False
    onboarding_complete: bool = False
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class WorkspaceMember(BaseModel):
    id: str
    workspace_id: str
    user_id: str
    role: Role
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class WorkspaceInvitation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    email: str
    role: Role
    invited_by: str
    status: str = "Pending IAP access"
    created_at: datetime = Field(default_factory=now)


class PolicySettings(BaseModel):
    workspace_id: str
    storage: PolicyDecision = PolicyDecision.REQUIRE_APPROVAL
    cloud_run: PolicyDecision = PolicyDecision.REQUIRE_APPROVAL
    firewall: PolicyDecision = PolicyDecision.REQUIRE_APPROVAL
    updated_at: datetime = Field(default_factory=now)


class Approval(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    plan_id: str
    user_id: str
    decision: str
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    review_id: str
    kind: str
    status: str = "QUEUED"
    error: str | None = None
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class AuthenticatedUser(BaseModel):
    id: str
    email: str
    display_name: str
    workspace_id: str
    role: Role
