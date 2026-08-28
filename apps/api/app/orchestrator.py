from .config import Settings
from .controls import REGISTRY, evaluate, map_question, plan_for
from .gcp import GcpControlAdapter, PermissionGap, preview_evidence
from .models import ActivityEvent, ControlResult, ControlStatus, Interpretation, PolicySettings, Review
from .policy import PolicyEngine
from .store import store


class ReviewOrchestrator:
    def __init__(self, settings: Settings, target_project_id: str | None = None):
        self.settings = settings
        self.target_project_id = target_project_id or settings.trustfix_target_project_id
        self.policy = PolicyEngine()

    def interpret(self, question: str) -> Interpretation:
        control_id = map_question(question)
        if control_id:
            definition = REGISTRY[control_id]
            return Interpretation(question=question, security_domain="Cloud security", assertion=definition.description, controls=[control_id], required_evidence=[definition.name], confidence=0.94)
        return Interpretation(question=question, security_domain="Unsupported", assertion="This requirement cannot be verified from the connected Google Cloud environment.", controls=[], required_evidence=[], confidence=0.98)

    def _collect(self, workspace_id: str, control_id: str):
        if self.settings.preview_mode or not self.target_project_id:
            return preview_evidence(workspace_id, control_id)
        adapter = GcpControlAdapter(self.target_project_id or "")
        if control_id == "GCP_STORAGE_PUBLIC_ACCESS":
            return adapter.collect_storage(workspace_id)
        if control_id == "GCP_RUN_PUBLIC_INVOKER":
            return adapter.collect_run(workspace_id, self.settings.google_cloud_region)
        return adapter.collect_firewall(workspace_id)

    def run(self, review: Review, strict_permissions: bool = False) -> Review:
        review.target_project_id = None if self.settings.preview_mode else self.target_project_id
        workspace_policy = store.get("policy_settings", review.workspace_id) or PolicySettings(workspace_id=review.workspace_id)
        self.policy = PolicyEngine(workspace_policy)
        review.status = "Scanning"
        store.put("reviews", review.id, review)
        for item in review.questions:
            interpretation = self.interpret(item.question)
            if not interpretation.controls:
                item.status = ControlStatus.UNSUPPORTED
                item.answer = "Needs review — TrustFix cannot verify this requirement from the currently connected Google Cloud environment."
                continue
            item.control_id = interpretation.controls[0]
            self.activity(review, "TrustFix orchestrator", "Question mapped", item.control_id, "Completed")
            try:
                evidence = self._collect(review.workspace_id, item.control_id)
                result = evaluate(item.control_id, evidence)
            except PermissionGap as gap:
                if strict_permissions:
                    raise
                result = ControlResult(control_id=item.control_id, status=ControlStatus.NEEDS_REVIEW, summary=str(gap), missing_permission=gap.permission)
            item.status = result.status
            item.evidence_ids = [e.id for e in result.evidence]
            for ev in result.evidence:
                store.put("evidence", ev.id, ev)
            store.put("control_results", f"{review.id}:{item.id}", result)
            if result.status == ControlStatus.FAILED:
                plan = plan_for(review.workspace_id, result, self.policy)
                plan.review_id = review.id
                store.put("remediation_plans", plan.id, plan)
                self.activity(review, "TrustFix evaluator", "Control failed", result.evidence[0].resource, "Remediation proposed")
            elif result.status == ControlStatus.VERIFIED:
                item.answer = f"Yes — {result.summary} Verified against live infrastructure." if all(e.live for e in result.evidence) else "Preview result only — connect the isolated demo project to generate a verified answer."
        failed = any(q.status == ControlStatus.FAILED for q in review.questions)
        needs_review = any(q.status in {ControlStatus.NEEDS_REVIEW, ControlStatus.UNSUPPORTED} for q in review.questions)
        review.status = "Needs attention" if failed or needs_review else "Ready"
        store.put("reviews", review.id, review)
        return review

    def activity(self, review: Review, actor: str, action: str, resource: str, result: str) -> None:
        event = ActivityEvent(workspace_id=review.workspace_id, review_id=review.id, actor=actor, action=action, resource=resource, result=result)
        store.put("activity_events", event.id, event)
