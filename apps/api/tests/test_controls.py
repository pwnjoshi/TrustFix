from app.controls import evaluate, map_question, plan_for
from app.models import ControlStatus, Evidence, PolicyDecision, Review, ReviewQuestion
from app.policy import PolicyEngine
from app.config import Settings
from app.orchestrator import ReviewOrchestrator


def test_maps_supported_controls():
    assert map_question("Is customer storage inaccessible from the public internet?") == "GCP_STORAGE_PUBLIC_ACCESS"
    assert map_question("Do internal production services require authentication?") == "GCP_RUN_PUBLIC_INVOKER"
    assert map_question("Are administrative interfaces restricted from untrusted networks?") == "GCP_FIREWALL_ADMIN_EXPOSURE"


def test_maps_expanded_cloud_service_controls():
    cases = {
        "Are BigQuery datasets protected from public access?": "GCP_BIGQUERY_PUBLIC_DATASET",
        "Can anonymous users access Pub/Sub topics?": "GCP_PUBSUB_PUBLIC_ACCESS",
        "Are Cloud Functions publicly invokable?": "GCP_FUNCTIONS_PUBLIC_INVOKER",
        "Is Artifact Registry protected from public access?": "GCP_ARTIFACT_REGISTRY_PUBLIC_ACCESS",
        "Do Compute VMs have public IP addresses?": "GCP_COMPUTE_PUBLIC_IP",
        "Are VPC flow logs enabled on every subnet?": "GCP_VPC_FLOW_LOGS",
        "Is DNSSEC enabled for Cloud DNS zones?": "GCP_DNS_DNSSEC",
        "Does Redis require transit encryption?": "GCP_REDIS_TRANSIT_ENCRYPTION",
        "Does Spanner allow public access?": "GCP_SPANNER_PUBLIC_ACCESS",
        "Do Dataproc clusters use internal IPs?": "GCP_DATAPROC_PRIVATE_NODES",
        "Are API keys restricted to approved services?": "GCP_API_KEYS_RESTRICTED",
    }
    for question, expected in cases.items():
        assert map_question(question) == expected


def test_expanded_control_evaluator_fails_only_on_explicit_violation():
    safe = Evidence(workspace_id="w", control_id="GCP_BIGQUERY_PUBLIC_DATASET", source="test", project="p", resource="safe", resource_identifier="safe", observation="safe", relevant_properties={"violation": False})
    unsafe = Evidence(workspace_id="w", control_id="GCP_BIGQUERY_PUBLIC_DATASET", source="test", project="p", resource="unsafe", resource_identifier="unsafe", observation="unsafe", relevant_properties={"violation": True})
    assert evaluate("GCP_BIGQUERY_PUBLIC_DATASET", [safe]).status == ControlStatus.VERIFIED
    assert evaluate("GCP_BIGQUERY_PUBLIC_DATASET", [safe, unsafe]).status == ControlStatus.FAILED


def test_unsupported_question_is_not_mapped():
    assert map_question("Do employees complete phishing training?") is None


def test_storage_evaluator_is_deterministic():
    evidence = [Evidence(workspace_id="w", control_id="GCP_STORAGE_PUBLIC_ACCESS", source="test", project="p", resource="b", resource_identifier="gs://b", observation="public", relevant_properties={"public_principals": [{"members": ["allUsers"]}]})]
    result = evaluate("GCP_STORAGE_PUBLIC_ACCESS", evidence)
    assert result.status == ControlStatus.FAILED
    plan = plan_for("w", result, PolicyEngine())
    assert plan.decision == PolicyDecision.REQUIRE_APPROVAL


def test_firewall_stays_manual_without_a_production_executor():
    assert PolicyEngine().decide("GCP_FIREWALL_ADMIN_EXPOSURE", risk="HIGH") == PolicyDecision.MANUAL_ONLY


def test_plan_targets_the_failing_resource():
    safe = Evidence(workspace_id="w", control_id="GCP_FIREWALL_ADMIN_EXPOSURE", source="test", project="p", resource="safe", resource_identifier="safe", observation="safe", relevant_properties={"exposed_admin_ports": []})
    failing = Evidence(workspace_id="w", control_id="GCP_FIREWALL_ADMIN_EXPOSURE", source="test", project="p", resource="open", resource_identifier="open", observation="open", relevant_properties={"exposed_admin_ports": ["22"]})
    plan = plan_for("w", evaluate("GCP_FIREWALL_ADMIN_EXPOSURE", [safe, failing]), PolicyEngine())
    assert plan.resource == "open"


def test_orchestrator_accepts_workspace_target_override():
    orchestrator = ReviewOrchestrator(Settings(trustfix_target_project_id="deployment-default"), "workspace-target")
    assert orchestrator.target_project_id == "workspace-target"


def test_full_control_catalog_runs_without_crossing_mutation_boundary(monkeypatch):
    from app.controls import REGISTRY
    from app.store import MemoryStore
    import app.orchestrator as orchestrator_module

    memory = MemoryStore()
    monkeypatch.setattr(orchestrator_module, "store", memory)
    review = Review(
        workspace_id="workspace-full",
        target_project_id="trustfix-demo-target",
        name="Full Google Cloud Posture Scan",
        questions=[ReviewQuestion(question=definition.description, control_id=control_id) for control_id, definition in REGISTRY.items()],
    )

    result = ReviewOrchestrator(Settings(preview_mode=True), "trustfix-demo-target").run(review)

    assert len(result.questions) == 20
    assert all(question.status in {ControlStatus.VERIFIED, ControlStatus.FAILED} for question in result.questions)
    plans = memory.list("remediation_plans")
    decisions = {plan.control_id: plan.decision for plan in plans}
    assert decisions["GCP_STORAGE_PUBLIC_ACCESS"] == PolicyDecision.REQUIRE_APPROVAL
    assert decisions["GCP_RUN_PUBLIC_INVOKER"] == PolicyDecision.MANUAL_ONLY
    assert decisions["GCP_FIREWALL_ADMIN_EXPOSURE"] == PolicyDecision.MANUAL_ONLY
