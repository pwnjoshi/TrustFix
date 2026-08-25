from app.controls import evaluate, map_question, plan_for
from app.models import ControlStatus, Evidence, PolicyDecision
from app.policy import PolicyEngine
from app.config import Settings
from app.orchestrator import ReviewOrchestrator


def test_maps_supported_controls():
    assert map_question("Is customer storage inaccessible from the public internet?") == "GCP_STORAGE_PUBLIC_ACCESS"
    assert map_question("Do internal production services require authentication?") == "GCP_RUN_PUBLIC_INVOKER"
    assert map_question("Are administrative interfaces restricted from untrusted networks?") == "GCP_FIREWALL_ADMIN_EXPOSURE"


def test_unsupported_question_is_not_mapped():
    assert map_question("Do employees complete phishing training?") is None


def test_storage_evaluator_is_deterministic():
    evidence = [Evidence(workspace_id="w", control_id="GCP_STORAGE_PUBLIC_ACCESS", source="test", project="p", resource="b", resource_identifier="gs://b", observation="public", relevant_properties={"public_principals": [{"members": ["allUsers"]}]})]
    result = evaluate("GCP_STORAGE_PUBLIC_ACCESS", evidence)
    assert result.status == ControlStatus.FAILED
    plan = plan_for("w", result, PolicyEngine())
    assert plan.decision == PolicyDecision.REQUIRE_APPROVAL


def test_firewall_always_requires_approval():
    assert PolicyEngine().decide("GCP_FIREWALL_ADMIN_EXPOSURE", risk="HIGH") == PolicyDecision.REQUIRE_APPROVAL


def test_plan_targets_the_failing_resource():
    safe = Evidence(workspace_id="w", control_id="GCP_FIREWALL_ADMIN_EXPOSURE", source="test", project="p", resource="safe", resource_identifier="safe", observation="safe", relevant_properties={"exposed_admin_ports": []})
    failing = Evidence(workspace_id="w", control_id="GCP_FIREWALL_ADMIN_EXPOSURE", source="test", project="p", resource="open", resource_identifier="open", observation="open", relevant_properties={"exposed_admin_ports": ["22"]})
    plan = plan_for("w", evaluate("GCP_FIREWALL_ADMIN_EXPOSURE", [safe, failing]), PolicyEngine())
    assert plan.resource == "open"


def test_orchestrator_accepts_workspace_target_override():
    orchestrator = ReviewOrchestrator(Settings(trustfix_target_project_id="deployment-default"), "workspace-target")
    assert orchestrator.target_project_id == "workspace-target"
