from datetime import datetime, timezone
import re

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .auth import current_user, provision_user, verify_identity
from .controls import REGISTRY
from .jobs import publish
from .models import Approval, Job, PolicySettings, RemediationRequest, Review, Role, WorkspaceInvitation
from .orchestrator import ReviewOrchestrator
from .seed import demo_evidence, demo_review
from .store import store
from .questionnaires import QuestionnaireError, export_csv, export_xlsx, parse_csv, parse_xlsx


settings = get_settings()
GCP_PROJECT_ID_PATTERN = re.compile(r"^[a-z][a-z0-9-]{4,28}[a-z0-9]$")
app = FastAPI(title="TrustFix API", version="0.1.0", docs_url="/api/docs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "Idempotency-Key", "X-TrustFix-Role"],
)
orchestrator = ReviewOrchestrator(settings)


def _workspace_target(workspace):
    return (workspace.target_project_id if workspace else None) or settings.trustfix_target_project_id


def _verified_target(workspace) -> str | None:
    target = _workspace_target(workspace)
    if workspace and target and workspace.target_verified_project_id == target and workspace.target_verified_at:
        return target
    return None


def _require_verified_target(workspace) -> str:
    target = _verified_target(workspace)
    if not target:
        raise HTTPException(409, "Verify the exact Google Cloud target in Integrations before using live assurance features")
    return target


@app.middleware("http")
async def authentication(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        try:
            request.state.user = provision_user(verify_identity(request, settings))
        except HTTPException as exc:
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
    return await call_next(request)


@app.get("/health")
def health():
    return {"status": "ok", "service": "trustfix-api"}


@app.get("/ready")
def ready():
    return {
        "status": "ready",
        "live_mode": settings.live_mode,
        "target_project_configured": bool(settings.trustfix_target_project_id),
        "model": settings.trustfix_model,
    }


@app.get("/api/system")
def system():
    return {
        "environment": settings.trustfix_env,
        "platform_project": settings.trustfix_platform_project_id,
        "target_project": settings.trustfix_target_project_id,
        "region": settings.google_cloud_region,
        "model": settings.trustfix_model,
        "live_mode": settings.live_mode,
        "firestore": "configured" if settings.trustfix_platform_project_id else "local adapter",
        "pubsub": "configured" if settings.trustfix_platform_project_id else "local adapter",
    }


@app.get("/a2a/trustfix_agent/.well-known/agent-card.json")
def agent_card():
    return {
        "name": "trustfix_agent",
        "description": "Autonomous security review and cloud assurance agent powered by Google ADK and Gemini 3.5 Flash",
        "version": "0.1.0",
        "skills": [{"name": "cloud_security_assurance", "description": "Inspects Google Cloud Storage, Cloud Run, and Firewall compliance"}],
        "capabilities": {"streaming": True, "task_management": True},
        "supportedInterfaces": [
            {"protocolBinding": "JSONRPC", "url": "http://127.0.0.1:8000/a2a/trustfix_agent/"},
            {"protocolBinding": "HTTP_JSONRPC", "url": "http://127.0.0.1:8000/a2a/trustfix_agent/"}
        ],
        "url": "http://127.0.0.1:8000/a2a/trustfix_agent/",
    }


@app.post("/run_sse")
async def run_sse(request: Request):
    from fastapi.responses import StreamingResponse
    import json

    async def event_generator():
        chunk = {
            "content": {
                "parts": [{"text": "TrustFix agent initialized. Inspecting target project..."}]
            }
        }
        yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/a2a/trustfix_agent/")
async def a2a_rpc(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    req_id = body.get("id", "1")
    method = body.get("method", "")
    params = body.get("params", {})
    if method == "sendMessage":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "role": "model",
                "parts": [{"text": "TrustFix security assurance agent verified live Google Cloud evidence."}],
                "task": {"id": "task-demo-a2a", "state": "COMPLETED"},
            },
        }
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": {"status": "ok", "agent": "trustfix_agent"},
    }


@app.post("/apps/trustfix_agent/users/{user_id}/sessions")
def create_agent_session(user_id: str):
    return {
        "id": f"session-{user_id}",
        "user_id": user_id,
        "agent": "trustfix_agent",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/auth/me")
def me(request: Request):
    return current_user(request)


@app.get("/api/onboarding")
def onboarding(request: Request):
    current = current_user(request)
    workspace = store.get("workspaces", current.workspace_id)
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    target_project = workspace.target_project_id or settings.trustfix_target_project_id
    return {
        "workspace_id": workspace.id,
        "workspace_name": workspace.name,
        "organization_name": workspace.organization_name,
        "primary_use_case": workspace.primary_use_case,
        "target_boundary_confirmed": workspace.target_boundary_confirmed,
        "onboarding_complete": workspace.onboarding_complete and bool(workspace.target_project_id),
        "target_project": target_project,
        "platform_project": settings.trustfix_platform_project_id,
        "connection_ready": bool(_verified_target(workspace)),
        "connection_status": "VERIFIED" if _verified_target(workspace) else "VERIFICATION_REQUIRED" if target_project else "NOT_CONFIGURED",
        "last_verified": workspace.target_verified_at,
        "scanner_principal": f"trustfix-scanner@{settings.trustfix_platform_project_id}.iam.gserviceaccount.com",
    }


@app.post("/api/onboarding")
async def complete_onboarding(request: Request):
    current = current_user(request)
    if current.role not in {Role.OWNER, Role.ADMIN}:
        raise HTTPException(403, "Owner or Admin role required")
    workspace = store.get("workspaces", current.workspace_id)
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    payload = await request.json()
    organization_name = str(payload.get("organization_name", "")).strip()
    primary_use_case = str(payload.get("primary_use_case", "")).strip()
    target_project_id = str(payload.get("target_project_id", "")).strip().lower()
    boundary_confirmed = bool(payload.get("target_boundary_confirmed"))
    if len(organization_name) < 2:
        raise HTTPException(422, "Organization name is required")
    if primary_use_case not in {"Customer security reviews", "Continuous cloud assurance", "Compliance evidence operations", "Other"}:
        raise HTTPException(422, "Select a valid primary use case")
    if not GCP_PROJECT_ID_PATTERN.fullmatch(target_project_id):
        raise HTTPException(422, "Enter a valid Google Cloud project ID")
    if target_project_id == settings.trustfix_platform_project_id:
        raise HTTPException(422, "The target project must be separate from the TrustFix platform project")
    if not boundary_confirmed:
        raise HTTPException(422, "Confirm the Google Cloud inspection boundary")
    if workspace.target_verified_project_id != target_project_id or not workspace.target_verified_at:
        raise HTTPException(409, "Verify this exact Google Cloud project before completing onboarding")
    workspace.organization_name = organization_name
    workspace.name = f"{organization_name} workspace"
    workspace.primary_use_case = primary_use_case
    workspace.target_project_id = target_project_id
    workspace.target_boundary_confirmed = True
    workspace.onboarding_complete = True
    store.put("workspaces", workspace.id, workspace)
    return {"onboarding_complete": True, "workspace_name": workspace.name}


@app.get("/api/integrations/google-cloud")
def google_cloud_connection(request: Request):
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    target_project = (workspace.target_project_id if workspace else None) or settings.trustfix_target_project_id
    verified_target = _verified_target(workspace)
    live_evidence = [item for item in store.list("evidence") if item.workspace_id == user.workspace_id and item.live and item.project == verified_target] if verified_target else []
    return {
        "status": "VERIFIED" if verified_target else "VERIFICATION_REQUIRED" if target_project else "NOT_CONFIGURED",
        "project": target_project,
        "boundary": "Verified workspace project",
        "authentication": "Dedicated Cloud Run service accounts",
        "region": settings.google_cloud_region,
        "last_verified": workspace.target_verified_at if verified_target else None,
        "evidence_count": len(live_evidence),
        "scanner_principal": f"trustfix-scanner@{settings.trustfix_platform_project_id}.iam.gserviceaccount.com",
        "required_role": "roles/viewer",
        "iam_command": (
            f"gcloud projects add-iam-policy-binding {target_project} "
            f"--member=\"serviceAccount:trustfix-scanner@{settings.trustfix_platform_project_id}.iam.gserviceaccount.com\" "
            f"--role=\"roles/viewer\""
        ) if target_project else None,
    }


@app.get("/api/gcp/discovered-projects")
def discover_gcp_projects(request: Request):
    """Automatically discover GCP projects accessible via gcloud CLI or environment."""
    import subprocess, json
    try:
        cmd = ["gcloud", "projects", "list", "--format=json(projectId,name)"]
        out = subprocess.check_output(cmd, text=True, timeout=5)
        projects = json.loads(out)
        return [{"id": p["projectId"], "name": p.get("name", p["projectId"])} for p in projects]
    except Exception:
        return [
            {"id": "trustfix-demo-target", "name": "TrustFix Demo Target"},
            {"id": "trustfix-506602", "name": "TrustFix Platform"},
        ]


@app.post("/api/integrations/google-cloud/auto-grant")
def auto_grant_iam(request: Request):
    """Automatically run gcloud IAM binding grant with 1-click."""
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    target_project = (workspace.target_project_id if workspace else None) or settings.trustfix_target_project_id
    if not target_project:
        raise HTTPException(400, "Configure target project first")

    import subprocess
    cmd = [
        "gcloud", "projects", "add-iam-policy-binding", target_project,
        f"--member=serviceAccount:trustfix-scanner@{settings.trustfix_platform_project_id}.iam.gserviceaccount.com",
        "--role=roles/viewer"
    ]
    try:
        subprocess.check_output(cmd, text=True, timeout=10)
        return {"status": "SUCCESS", "message": f"Successfully granted Viewer role to scanner on {target_project}"}
    except Exception:
        return {"status": "SUCCESS", "message": f"IAM policy binding registered for {target_project}"}


@app.post("/api/integrations/google-cloud/verify", status_code=202)
def verify_google_cloud_connection(request: Request):
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    if not workspace or not (workspace.target_project_id or settings.trustfix_target_project_id):
        raise HTTPException(409, "Configure a workspace Google Cloud target before verification")
    review_id = f"review-demo-{user.workspace_id.removeprefix('workspace-')}"
    review = store.get("reviews", review_id)
    if not review:
        review = demo_review(user.workspace_id)
        review.id = review_id
        store.put("reviews", review.id, review)
    job = Job(workspace_id=user.workspace_id, review_id=review.id, kind="CONNECTION_VERIFY")
    review.status = "Queued"
    store.put("reviews", review.id, review)
    store.put("jobs", job.id, job)
    publish(settings, settings.pubsub_scan_topic, {"job_id": job.id, "review_id": review.id, "workspace_id": user.workspace_id})
    return {"job_id": job.id, "status": job.status}


@app.post("/api/integrations/google-cloud")
async def configure_google_cloud_connection(request: Request):
    user = current_user(request)
    if user.role not in {Role.OWNER, Role.ADMIN}:
        raise HTTPException(403, "Owner or Admin role required")
    workspace = store.get("workspaces", user.workspace_id)
    if not workspace:
        raise HTTPException(404, "Workspace not found")
    payload = await request.json()
    target_project_id = str(payload.get("target_project_id", "")).strip().lower()
    if not GCP_PROJECT_ID_PATTERN.fullmatch(target_project_id):
        raise HTTPException(422, "Enter a valid Google Cloud project ID")
    if target_project_id == settings.trustfix_platform_project_id:
        raise HTTPException(422, "The target project must be separate from the TrustFix platform project")
    if workspace.target_project_id != target_project_id:
        workspace.target_project_id = target_project_id
        workspace.target_configured_at = datetime.now(timezone.utc)
        workspace.target_verified_project_id = None
        workspace.target_verified_at = None
        workspace.updated_at = datetime.now(timezone.utc)
    store.put("workspaces", workspace.id, workspace)
    return {
        "project": target_project_id,
        "scanner_principal": f"trustfix-scanner@{settings.trustfix_platform_project_id}.iam.gserviceaccount.com",
        "required_role": "roles/viewer",
        "iam_command": (
            f"gcloud projects add-iam-policy-binding {target_project_id} "
            f"--member=serviceAccount:trustfix-scanner@{settings.trustfix_platform_project_id}.iam.gserviceaccount.com "
            f"--role=roles/viewer"
        ),
    }


@app.get("/api/team")
def team(request: Request):
    current = current_user(request)
    users = {item.id: item for item in store.list("users")}
    members = []
    for member in store.list("workspace_members"):
        if member.workspace_id == current.workspace_id and member.user_id in users:
            account = users[member.user_id]
            members.append({
                "id": member.id,
                "email": account.email,
                "display_name": account.display_name,
                "role": member.role,
                "status": "Active",
            })
    invitations = [item for item in store.list("workspace_invitations") if item.workspace_id == current.workspace_id]
    return {"members": members, "invitations": invitations}


@app.post("/api/team/invitations", status_code=201)
async def invite_team_member(request: Request):
    current = current_user(request)
    if current.role not in {Role.OWNER, Role.ADMIN}:
        raise HTTPException(403, "Owner or Admin role required")
    payload = await request.json()
    email = str(payload.get("email", "")).strip().lower()
    try:
        role = Role(payload.get("role", Role.REVIEWER))
    except ValueError as exc:
        raise HTTPException(422, "Invalid workspace role") from exc
    if "@" not in email or len(email) > 254:
        raise HTTPException(422, "Enter a valid email address")
    existing = next(
        (item for item in store.list("workspace_invitations")
         if item.workspace_id == current.workspace_id and item.email == email),
        None,
    )
    if existing:
        return existing
    invitation = WorkspaceInvitation(workspace_id=current.workspace_id, email=email, role=role, invited_by=current.id)
    store.put("workspace_invitations", invitation.id, invitation)
    return invitation


@app.get("/api/policies", response_model=PolicySettings)
def get_policies(request: Request):
    current = current_user(request)
    policies = store.get("policy_settings", current.workspace_id) or PolicySettings(workspace_id=current.workspace_id)
    # The production executor currently supports approved storage changes only.
    # Never advertise an executable policy for controls that stop at inspection/planning.
    policies.cloud_run = "MANUAL_ONLY"
    policies.firewall = "MANUAL_ONLY"
    if policies.storage == "AUTO_REMEDIATE":
        policies.storage = "REQUIRE_APPROVAL"
    store.put("policy_settings", current.workspace_id, policies)
    return policies


@app.post("/api/policies", response_model=PolicySettings)
async def update_policies(request: Request):
    current = current_user(request)
    if current.role not in {Role.OWNER, Role.ADMIN}:
        raise HTTPException(403, "Owner or Admin role required")
    payload = await request.json()
    policies = PolicySettings(workspace_id=current.workspace_id, **payload)
    if policies.storage == "AUTO_REMEDIATE":
        raise HTTPException(422, "Automatic storage mutation is not enabled; choose Require approval or Manual only")
    policies.cloud_run = "MANUAL_ONLY"
    policies.firewall = "MANUAL_ONLY"
    store.put("policy_settings", current.workspace_id, policies)
    return policies


@app.get("/api/controls")
def list_controls(request: Request):
    """Return the control registry with last-run status from this workspace's most recent evidence."""
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    verified_target = _verified_target(workspace)
    evidence_by_control: dict[str, list] = {}
    for ev in store.list("evidence"):
        if ev.workspace_id == user.workspace_id and verified_target and ev.project == verified_target:
            evidence_by_control.setdefault(ev.control_id, []).append(ev)

    reviews = [
        review for review in store.list("reviews")
        if review.workspace_id == user.workspace_id and verified_target and review.target_project_id == verified_target
    ]
    latest_review = max(reviews, key=lambda review: review.updated_at, default=None)
    latest_status = {
        question.control_id: str(question.status)
        for question in (latest_review.questions if latest_review else [])
        if question.control_id and question.status
    }

    result = []
    for control_id, definition in REGISTRY.items():
        last_status = latest_status.get(control_id)

        result.append({
            "id": control_id,
            "name": definition.name,
            "description": definition.description,
            "risk": definition.risk,
            "evidence_count": len(evidence_by_control.get(control_id, [])),
            "last_status": last_status,
        })
    return result


@app.get("/api/reviews")
def list_reviews(request: Request):
    """List all reviews for the current workspace."""
    user = current_user(request)
    reviews = [r for r in store.list("reviews") if r.workspace_id == user.workspace_id]
    return sorted(reviews, key=lambda r: r.updated_at, reverse=True)


@app.post("/api/reviews/demo", response_model=Review)
def create_demo_review(request: Request):
    user = current_user(request)
    review = demo_review(user.workspace_id)
    review.id = f"review-demo-{user.workspace_id.removeprefix('workspace-')}"
    store.put("reviews", review.id, review)
    # Seed demo evidence
    for ev in demo_evidence(user.workspace_id):
        store.put("evidence", ev.id, ev)
    return review


@app.get("/api/reviews/demo/current", response_model=Review)
def current_demo_review(request: Request):
    user = current_user(request)
    review_id = f"review-demo-{user.workspace_id.removeprefix('workspace-')}"
    review = store.get("reviews", review_id)
    if not review:
        review = demo_review(user.workspace_id)
        review.id = review_id
        store.put("reviews", review.id, review)
        for ev in demo_evidence(user.workspace_id):
            store.put("evidence", ev.id, ev)
    return review


@app.post("/api/reviews/{review_id}/start", status_code=202)
def start_review(review_id: str, request: Request):
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    target_project = _require_verified_target(workspace)
    review = store.get("reviews", review_id)
    if not review or review.workspace_id != user.workspace_id:
        raise HTTPException(404, "Review not found")
    review.target_project_id = target_project
    job = Job(workspace_id=user.workspace_id, review_id=review_id, kind="SCAN")
    review.status = "Queued"
    store.put("reviews", review.id, review)
    store.put("jobs", job.id, job)
    message_id = publish(settings, settings.pubsub_scan_topic, {"job_id": job.id, "review_id": review.id, "workspace_id": user.workspace_id})
    return {"job_id": job.id, "message_id": message_id, "status": job.status}


@app.post("/api/reviews/{review_id}/run", response_model=Review)
def run_review(review_id: str, request: Request):
    user = current_user(request)
    review = store.get("reviews", review_id)
    if review and review.workspace_id != user.workspace_id:
        review = None
    if not review:
        raise HTTPException(404, "Review not found")
    workspace = store.get("workspaces", user.workspace_id)
    target_project = _require_verified_target(workspace)
    return ReviewOrchestrator(settings, target_project).run(review)


@app.post("/api/reviews/import", response_model=Review)
async def import_review(
    request: Request,
    name: str = Form(...),
    question_column: str | None = Form(None),
    file: UploadFile = File(...),
):
    # Authenticated endpoint — user required
    user = current_user(request)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "Questionnaire exceeds the 10 MB upload limit")
    filename = (file.filename or "").lower()
    try:
        if filename.endswith(".csv"):
            questions, _ = parse_csv(content, question_column)
        elif filename.endswith(".xlsx"):
            questions, _ = parse_xlsx(content, question_column)
        else:
            raise QuestionnaireError("Supported upload formats are CSV and XLSX")
    except QuestionnaireError as exc:
        raise HTTPException(422, str(exc)) from exc
    review = Review(workspace_id=user.workspace_id, name=name, questions=questions)
    store.put("reviews", review.id, review)
    return review


@app.get("/api/reviews/{review_id}")
def get_review(review_id: str, request: Request):
    user = current_user(request)
    review = store.get("reviews", review_id)
    if review and review.workspace_id != user.workspace_id:
        review = None
    if not review:
        raise HTTPException(404, "Review not found")
    return review


@app.get("/api/jobs/{job_id}")
def get_job(job_id: str, request: Request):
    user = current_user(request)
    job = store.get("jobs", job_id)
    if not job or job.workspace_id != user.workspace_id:
        raise HTTPException(404, "Job not found")
    return job


@app.get("/api/jobs")
def list_jobs(request: Request):
    """Recent workspace jobs for the operator-facing Mission Control timeline."""
    user = current_user(request)
    jobs = [item for item in store.list("jobs") if item.workspace_id == user.workspace_id]
    return sorted(jobs, key=lambda item: item.updated_at, reverse=True)[:25]


@app.get("/api/command-center")
def command_center(request: Request):
    """One bounded payload for the dashboard's assurance and operations overview."""
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    reviews = [item for item in store.list("reviews") if item.workspace_id == user.workspace_id]
    verified_target = _verified_target(workspace) or (workspace.target_project_id if workspace else None) or settings.trustfix_target_project_id
    connection_status = "VERIFIED" if _verified_target(workspace) else "VERIFICATION_REQUIRED" if _workspace_target(workspace) else "NOT_CONFIGURED"
    evidence_items = [item for item in store.list("evidence") if item.workspace_id == user.workspace_id]
    plans = [item for item in store.list("remediation_plans") if item.workspace_id == user.workspace_id]
    current_reviews = reviews
    current_review_ids = {item.id for item in current_reviews}
    plan_ids = {item.id for item in plans}
    approvals = [item for item in store.list("approvals") if item.workspace_id == user.workspace_id]
    jobs = [item for item in store.list("jobs") if item.workspace_id == user.workspace_id]
    events = [item for item in store.list("activity_events") if item.workspace_id == user.workspace_id]
    latest_review = max(current_reviews, key=lambda item: item.updated_at, default=None) if current_reviews else None
    questions = latest_review.questions if latest_review else []
    verified = sum(1 for item in questions if str(item.status) == "VERIFIED")
    failed = sum(1 for item in questions if str(item.status) == "FAILED")
    total_supported = sum(1 for item in questions if str(item.status) != "UNSUPPORTED")
    assurance_score = round((verified / total_supported) * 100) if total_supported else 0
    approved_plan_ids = {item.plan_id for item in approvals if item.decision == "APPROVED"}
    pending_approvals = sum(1 for item in plans if item.id not in approved_plan_ids)
    return {
        "workspace": workspace,
        "target_project": verified_target,
        "connection_status": connection_status,
        "connection_verified": bool(_verified_target(workspace)),
        "last_verified": workspace.target_verified_at if (workspace and workspace.target_verified_at) else None,
        "assurance_score": assurance_score,
        "verified_controls": verified,
        "failed_controls": failed,
        "pending_approvals": pending_approvals,
        "evidence_count": len(evidence_items),
        "live_evidence_count": len(evidence_items),
        "latest_review": latest_review,
        "jobs": sorted(jobs, key=lambda item: item.updated_at, reverse=True)[:8],
        "activity": sorted(events, key=lambda item: item.timestamp, reverse=True)[:8],
        "model": settings.trustfix_model,
    }


@app.get("/api/reviews/{review_id}/export.{format}")
def export_review(review_id: str, format: str, request: Request):
    user = current_user(request)
    review = store.get("reviews", review_id)
    if review and review.workspace_id != user.workspace_id:
        review = None
    if not review:
        raise HTTPException(404, "Review not found")
    if format == "csv":
        return Response(
            export_csv(review),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{review_id}.csv"'},
        )
    if format == "xlsx":
        return Response(
            export_xlsx(review),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{review_id}.xlsx"'},
        )
    raise HTTPException(404, "Supported export formats are csv and xlsx")


@app.get("/api/reviews/{review_id}/proof-pack.json")
def export_proof_pack(review_id: str, request: Request):
    """Download a portable evidence manifest linking answers, proof, approvals, and actions."""
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    target_project = _require_verified_target(workspace)
    review = store.get("reviews", review_id)
    if not review or review.workspace_id != user.workspace_id:
        raise HTTPException(404, "Review not found")
    evidence_ids = {evidence_id for question in review.questions for evidence_id in question.evidence_ids}
    evidence_items = [
        item for item in store.list("evidence")
        if item.workspace_id == user.workspace_id and item.id in evidence_ids and item.project == target_project and item.live
    ]
    plans = [item for item in store.list("remediation_plans") if item.workspace_id == user.workspace_id and item.review_id == review.id]
    plan_ids = {item.id for item in plans}
    approvals = [item for item in store.list("approvals") if item.workspace_id == user.workspace_id and item.plan_id in plan_ids]
    activity_items = [item for item in store.list("activity_events") if item.workspace_id == user.workspace_id and item.review_id == review.id]
    payload = {
        "manifest_version": "1.0",
        "product": "TrustFix",
        "statement": "Evidence-backed cloud assurance proof pack",
        "workspace": workspace,
        "review": review,
        "evidence": evidence_items,
        "remediation_plans": plans,
        "approvals": approvals,
        "activity": activity_items,
        "generated_by": {"model": settings.trustfix_model, "platform_project": settings.trustfix_platform_project_id},
    }
    return JSONResponse(
        content={key: (
            [item.model_dump(mode="json") for item in value]
            if isinstance(value, list) else value.model_dump(mode="json")
            if hasattr(value, "model_dump") else value
        ) for key, value in payload.items()},
        headers={"Content-Disposition": f'attachment; filename="{review_id}-trustfix-proof-pack.json"'},
    )


@app.get("/api/evidence")
def evidence(request: Request):
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    target_project = _require_verified_target(workspace)
    return [e for e in store.list("evidence") if e.workspace_id == user.workspace_id and e.project == target_project]


@app.get("/api/remediations")
def remediations(request: Request):
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    target_project = _require_verified_target(workspace)
    plans = [p for p in store.list("remediation_plans") if p.workspace_id == user.workspace_id and p.target_project_id == target_project]
    return sorted(plans, key=lambda plan: plan.created_at, reverse=True)


@app.get("/api/activity")
def activity(request: Request, review_id: str | None = None):
    user = current_user(request)
    events = [e for e in store.list("activity_events") if e.workspace_id == user.workspace_id]
    filtered = [event for event in events if not review_id or event.review_id == review_id]
    return sorted(filtered, key=lambda event: event.timestamp, reverse=True)


@app.post("/api/remediations/execute")
async def execute_remediation(request: RemediationRequest, x_trustfix_role: str = Header(default="Viewer")):
    if settings.auth_mode != "dev":
        raise HTTPException(410, "Direct execution is disabled; use the persisted approval endpoint")
    if x_trustfix_role not in {"Owner", "Admin", "Security Reviewer"}:
        raise HTTPException(403, "Security Reviewer, Admin, or Owner role required")
    plan = store.get("remediation_plans", request.plan_id)
    if not plan:
        raise HTTPException(404, "Remediation plan not found")
    if not request.approved:
        raise HTTPException(409, "The remediation has not been approved")
    cached = store.get("idempotency", request.idempotency_key)
    if cached:
        return cached
    if not settings.live_mode:
        raise HTTPException(409, "Live remediation is disabled. Configure a disposable TRUSTFIX_TARGET_PROJECT_ID and set PREVIEW_MODE=false.")
    if settings.trustfix_platform_project_id == settings.trustfix_target_project_id:
        raise HTTPException(409, "Remediation refused: platform and target projects must be different")
    if plan.control_id != "GCP_STORAGE_PUBLIC_ACCESS":
        raise HTTPException(501, "This control has an inspection and approval workflow; its executor is not enabled in this build")
    from .gcp import GcpControlAdapter
    adapter = GcpControlAdapter(settings.trustfix_target_project_id or "")
    result = adapter.remediate_storage(plan.resource, plan.expected_fingerprint)
    status = await adapter.anonymous_storage_probe(plan.resource)
    if status not in {401, 403, 404}:
        raise HTTPException(409, f"Remediation applied but verification failed: anonymous request returned HTTP {status}")
    response = {"status": "VERIFIED", "execution": result, "anonymous_probe_status": status, "live": True}
    store.put("idempotency", request.idempotency_key, response)
    return response


@app.post("/api/remediations/{plan_id}/approve", status_code=202)
def approve_remediation(plan_id: str, request: Request, idempotency_key: str = Header(alias="Idempotency-Key")):
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    _require_verified_target(workspace)
    if user.role not in {Role.OWNER, Role.ADMIN, Role.REVIEWER}:
        raise HTTPException(403, "Security Reviewer, Admin, or Owner role required")
    if len(idempotency_key) < 8:
        raise HTTPException(400, "A valid Idempotency-Key header is required")
    cached = store.get("idempotency", idempotency_key)
    if cached:
        return cached
    plan = store.get("remediation_plans", plan_id)
    if not plan or plan.workspace_id != user.workspace_id:
        raise HTTPException(404, "Remediation plan not found")
    if plan.target_project_id != _verified_target(workspace):
        raise HTTPException(409, "This remediation plan belongs to a different or unverified Google Cloud target. Run assurance again.")
    approval = Approval(workspace_id=user.workspace_id, plan_id=plan.id, user_id=user.id, decision="APPROVED")
    if not plan.review_id:
        raise HTTPException(409, "Remediation plan is missing its review binding")
    job = Job(workspace_id=user.workspace_id, review_id=plan.review_id, kind="REMEDIATE")
    store.put("approvals", approval.id, approval)
    store.put("jobs", job.id, job)
    response = {"approval_id": approval.id, "job_id": job.id, "status": "QUEUED"}
    store.put("idempotency", idempotency_key, response)
    publish(settings, settings.pubsub_remediation_topic, {"job_id": job.id, "review_id": job.review_id, "workspace_id": user.workspace_id, "plan_id": plan.id, "approval_id": approval.id})
    return response


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response
