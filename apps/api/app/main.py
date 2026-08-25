from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .auth import current_user, provision_user, verify_identity
from .jobs import publish
from .models import Approval, Job, PolicySettings, RemediationRequest, Review, Role, WorkspaceInvitation
from .orchestrator import ReviewOrchestrator
from .seed import demo_review
from .store import store
from .questionnaires import QuestionnaireError, export_csv, export_xlsx, parse_csv, parse_xlsx


settings = get_settings()
app = FastAPI(title="TrustFix API", version="0.1.0", docs_url="/api/docs")
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins.split(","), allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Authorization", "Idempotency-Key", "X-TrustFix-Role"])
orchestrator = ReviewOrchestrator(settings)


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
    return {"status": "ready", "live_mode": settings.live_mode, "target_project_configured": bool(settings.trustfix_target_project_id), "model": settings.trustfix_model}


@app.get("/api/system")
def system():
    return {"environment": settings.trustfix_env, "platform_project": settings.trustfix_platform_project_id, "target_project": settings.trustfix_target_project_id, "region": settings.google_cloud_region, "model": settings.trustfix_model, "live_mode": settings.live_mode, "firestore": "configured" if settings.trustfix_platform_project_id else "local adapter", "pubsub": "configured" if settings.trustfix_platform_project_id else "local adapter"}


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
        "connection_ready": bool(target_project),
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
    if primary_use_case not in {"Customer security reviews", "Cloud security assurance", "Hackathon demonstration", "Other"}:
        raise HTTPException(422, "Select a valid primary use case")
    if not target_project_id or len(target_project_id) > 63 or not all(character.islower() or character.isdigit() or character == "-" for character in target_project_id):
        raise HTTPException(422, "Enter a valid Google Cloud project ID")
    if target_project_id == settings.trustfix_platform_project_id:
        raise HTTPException(422, "The target project must be separate from the TrustFix platform project")
    if not boundary_confirmed:
        raise HTTPException(422, "Confirm that the target is a disposable project")
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
    live_evidence = [item for item in store.list("evidence") if item.workspace_id == user.workspace_id and item.live]
    latest = max((item.collected_at for item in live_evidence), default=None)
    return {
        "status": "CONNECTED" if target_project else "NOT_CONFIGURED",
        "project": target_project,
        "boundary": "Disposable target project",
        "authentication": "Dedicated Cloud Run service accounts",
        "region": settings.google_cloud_region,
        "last_verified": latest,
        "evidence_count": len(live_evidence),
    }


@app.post("/api/integrations/google-cloud/verify", status_code=202)
def verify_google_cloud_connection(request: Request):
    user = current_user(request)
    workspace = store.get("workspaces", user.workspace_id)
    if not workspace or not (workspace.target_project_id or settings.trustfix_target_project_id):
        raise HTTPException(409, "Configure a workspace Google Cloud target before verification")
    review_id = f"review-demo-{user.workspace_id.removeprefix('workspace-')}"
    review = store.get("reviews", review_id)
    if not review:
        review = demo_review()
        review.id = review_id
        review.workspace_id = user.workspace_id
        store.put("reviews", review.id, review)
    job = Job(workspace_id=user.workspace_id, review_id=review.id, kind="SCAN")
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
    if not target_project_id or len(target_project_id) > 63 or not all(character.islower() or character.isdigit() or character == "-" for character in target_project_id):
        raise HTTPException(422, "Enter a valid Google Cloud project ID")
    if target_project_id == settings.trustfix_platform_project_id:
        raise HTTPException(422, "The target project must be separate from the TrustFix platform project")
    workspace.target_project_id = target_project_id
    store.put("workspaces", workspace.id, workspace)
    return {
        "project": target_project_id,
        "scanner_principal": f"trustfix-scanner@{settings.trustfix_platform_project_id}.iam.gserviceaccount.com",
        "required_role": "roles/viewer",
        "iam_command": f"gcloud projects add-iam-policy-binding {target_project_id} --member=serviceAccount:trustfix-scanner@{settings.trustfix_platform_project_id}.iam.gserviceaccount.com --role=roles/viewer",
    }


@app.get("/api/team")
def team(request: Request):
    current = current_user(request)
    users = {item.id: item for item in store.list("users")}
    members = []
    for member in store.list("workspace_members"):
        if member.workspace_id == current.workspace_id and member.user_id in users:
            account = users[member.user_id]
            members.append({"id": member.id, "email": account.email, "display_name": account.display_name, "role": member.role, "status": "Active"})
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
    existing = next((item for item in store.list("workspace_invitations") if item.workspace_id == current.workspace_id and item.email == email), None)
    if existing:
        return existing
    invitation = WorkspaceInvitation(workspace_id=current.workspace_id, email=email, role=role, invited_by=current.id)
    store.put("workspace_invitations", invitation.id, invitation)
    return invitation


@app.get("/api/policies", response_model=PolicySettings)
def get_policies(request: Request):
    current = current_user(request)
    policies = store.get("policy_settings", current.workspace_id) or PolicySettings(workspace_id=current.workspace_id)
    store.put("policy_settings", current.workspace_id, policies)
    return policies


@app.post("/api/policies", response_model=PolicySettings)
async def update_policies(request: Request):
    current = current_user(request)
    if current.role not in {Role.OWNER, Role.ADMIN}:
        raise HTTPException(403, "Owner or Admin role required")
    payload = await request.json()
    policies = PolicySettings(workspace_id=current.workspace_id, **payload)
    store.put("policy_settings", current.workspace_id, policies)
    return policies


@app.post("/api/reviews/demo", response_model=Review)
def create_demo_review(request: Request):
    user = current_user(request)
    review = demo_review()
    review.id = f"review-demo-{user.workspace_id.removeprefix('workspace-')}"
    review.workspace_id = user.workspace_id
    store.put("reviews", review.id, review)
    return review


@app.get("/api/reviews/demo/current", response_model=Review)
def current_demo_review(request: Request):
    user = current_user(request)
    review_id = f"review-demo-{user.workspace_id.removeprefix('workspace-')}"
    review = store.get("reviews", review_id)
    if not review:
        raise HTTPException(404, "Demo review not created")
    return review


@app.post("/api/reviews/{review_id}/start", status_code=202)
def start_review(review_id: str, request: Request):
    user = current_user(request)
    review = store.get("reviews", review_id)
    if not review or review.workspace_id != user.workspace_id:
        raise HTTPException(404, "Review not found")
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
    target_project = (workspace.target_project_id if workspace else None) or settings.trustfix_target_project_id
    return ReviewOrchestrator(settings, target_project).run(review)


@app.post("/api/reviews/import", response_model=Review)
async def import_review(name: str = Form(...), workspace_id: str = Form("workspace-demo"), question_column: str | None = Form(None), file: UploadFile = File(...)):
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
    review = Review(workspace_id=workspace_id, name=name, questions=questions)
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


@app.get("/api/reviews/{review_id}/export.{format}")
def export_review(review_id: str, format: str, request: Request):
    user = current_user(request)
    review = store.get("reviews", review_id)
    if review and review.workspace_id != user.workspace_id:
        review = None
    if not review:
        raise HTTPException(404, "Review not found")
    if format == "csv":
        return Response(export_csv(review), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{review_id}.csv"'})
    if format == "xlsx":
        return Response(export_xlsx(review), media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f'attachment; filename="{review_id}.xlsx"'})
    raise HTTPException(404, "Supported export formats are csv and xlsx")


@app.get("/api/evidence")
def evidence(request: Request):
    user = current_user(request)
    return [e for e in store.list("evidence") if e.workspace_id == user.workspace_id]


@app.get("/api/remediations")
def remediations(request: Request):
    user = current_user(request)
    plans = [p for p in store.list("remediation_plans") if p.workspace_id == user.workspace_id]
    return sorted(plans, key=lambda plan: plan.created_at, reverse=True)


@app.get("/api/activity")
def activity(request: Request, review_id: str | None = None):
    user = current_user(request)
    events = [e for e in store.list("activity_events") if e.workspace_id == user.workspace_id]
    return [event for event in events if not review_id or event.review_id == review_id]


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
