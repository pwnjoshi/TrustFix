"""Run the destructive acceptance test only against the disposable TrustFix target."""

import asyncio
import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps" / "api"))

os.environ["TRUSTFIX_PLATFORM_PROJECT_ID"] = "trustfix-506602"
os.environ["TRUSTFIX_TARGET_PROJECT_ID"] = "trustfix-demo-target"
os.environ["GOOGLE_CLOUD_REGION"] = "us-central1"
os.environ["PREVIEW_MODE"] = "false"

from app.config import get_settings  # noqa: E402
from app.controls import REGISTRY  # noqa: E402
from app.gcp import GcpControlAdapter  # noqa: E402
from app.models import Review, ReviewQuestion  # noqa: E402
from app.orchestrator import ReviewOrchestrator  # noqa: E402
from app.store import store  # noqa: E402


def main() -> None:
    settings = get_settings()
    if settings.trustfix_target_project_id != "trustfix-demo-target":
        raise RuntimeError("Acceptance refused: target is not trustfix-demo-target")

    review = Review(
        workspace_id="workspace-live-acceptance",
        target_project_id=settings.trustfix_target_project_id,
        name="TrustFix 20-control live acceptance",
        questions=[
            ReviewQuestion(original_row=index, question=definition.description, control_id=control_id)
            for index, (control_id, definition) in enumerate(REGISTRY.items(), start=1)
        ],
    )
    review = ReviewOrchestrator(settings).run(review)
    if len(review.questions) != 20 or any(question.status is None for question in review.questions):
        raise RuntimeError("Expected all 20 registered controls to receive a live result")
    initial = {question.control_id or "UNSUPPORTED": str(question.status) for question in review.questions}
    plans = [
        plan for plan in store.list("remediation_plans")
        if plan.review_id == review.id and plan.control_id == "GCP_STORAGE_PUBLIC_ACCESS"
    ]
    if len(plans) != 1:
        raise RuntimeError(f"Expected one storage remediation plan, found {len(plans)}")

    plan = plans[0]
    adapter = GcpControlAdapter(settings.trustfix_target_project_id)
    execution = adapter.remediate_storage(plan.resource, plan.expected_fingerprint)
    anonymous_status = asyncio.run(adapter.anonymous_storage_probe(plan.resource))
    if anonymous_status not in {401, 403, 404}:
        raise RuntimeError(f"Anonymous proof failed with HTTP {anonymous_status}")

    verified = adapter.collect_storage(review.workspace_id)
    target_name = plan.resource.removeprefix("gs://")
    target = next(item for item in verified if item.resource == target_name)
    if target.relevant_properties["public_principals"]:
        raise RuntimeError("Storage IAM still contains public principals")

    print(json.dumps({
        "target_project": settings.trustfix_target_project_id,
        "controls_inspected": len(review.questions),
        "initial_control_statuses": initial,
        "remediated_resource": plan.resource,
        "execution": execution,
        "anonymous_probe_status": anonymous_status,
        "post_fix_public_principals": target.relevant_properties["public_principals"],
        "result": "VERIFIED",
    }, indent=2))


if __name__ == "__main__":
    main()
