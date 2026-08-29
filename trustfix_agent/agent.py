"""Google ADK entrypoint for requirement interpretation and tool orchestration.

Control truth remains deterministic in apps/api/app/controls.py. This agent may
select a tool and summarize evidence, but it may not invent or override evidence.
"""
import os
from google.adk.agents import Agent


SUPPORTED = {
    "GCP_STORAGE_PUBLIC_ACCESS": "Public bucket IAM and anonymous access",
    "GCP_RUN_PUBLIC_INVOKER": "Cloud Run public invoker IAM",
    "GCP_FIREWALL_ADMIN_EXPOSURE": "Internet-exposed administrative ports",
    "GCP_SQL_PUBLIC_IP": "Cloud SQL public IPv4 exposure",
    "GCP_KMS_KEY_ROTATION": "Cloud KMS automatic key rotation",
    "GCP_IAM_KEYLESS_WORKLOADS": "User-managed service account keys",
    "GCP_LOGGING_ADMIN_AUDIT": "Cloud Audit Logs Data Access coverage",
    "GCP_SECRET_MANAGER_ROTATION_IAM": "Secret Manager public IAM access",
    "GCP_GKE_PRIVATE_CLUSTER": "GKE private control plane and authorized networks",
    "GCP_BIGQUERY_PUBLIC_DATASET": "BigQuery dataset public IAM access",
    "GCP_PUBSUB_PUBLIC_ACCESS": "Pub/Sub topic and subscription public IAM access",
    "GCP_FUNCTIONS_PUBLIC_INVOKER": "Cloud Run functions public invocation",
    "GCP_ARTIFACT_REGISTRY_PUBLIC_ACCESS": "Artifact Registry public IAM access",
    "GCP_COMPUTE_PUBLIC_IP": "Compute Engine external IP exposure",
    "GCP_VPC_FLOW_LOGS": "VPC subnetwork flow-log coverage",
    "GCP_DNS_DNSSEC": "Cloud DNS DNSSEC coverage",
    "GCP_REDIS_TRANSIT_ENCRYPTION": "Memorystore for Redis in-transit encryption",
    "GCP_SPANNER_PUBLIC_ACCESS": "Cloud Spanner public IAM access",
    "GCP_DATAPROC_PRIVATE_NODES": "Dataproc internal-only node IPs",
    "GCP_API_KEYS_RESTRICTED": "Google Cloud API key restrictions",
}


def supported_controls() -> dict[str, str]:
    """Return only the deterministic controls available to the orchestrator."""
    return SUPPORTED


root_agent = Agent(
    name="trustfix_review_orchestrator",
    model=os.getenv("TRUSTFIX_MODEL", "gemini-3.5-flash"),
    description="Maps security requirements to supported deterministic TrustFix controls.",
    instruction="""You interpret security questionnaire requirements. Select a control only from supported_controls. Never claim that a requirement passes and never manufacture evidence. If no supported control can verify the requirement, return UNSUPPORTED and explain that TrustFix cannot verify it from the connected Google Cloud environment. Keep decision summaries concise; never expose chain-of-thought.""",
    tools=[supported_controls],
)

from google.adk.apps import App

app = App(root_agent=root_agent, name="trustfix_agent")
