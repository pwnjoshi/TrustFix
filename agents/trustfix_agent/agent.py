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
}


def supported_controls() -> dict[str, str]:
    """Return only the deterministic controls available to the orchestrator."""
    return SUPPORTED


root_agent = Agent(
    name="trustfix_review_orchestrator",
    model=os.getenv("TRUSTFIX_MODEL", "gemini-2.5-flash"),
    description="Maps security requirements to supported deterministic TrustFix controls.",
    instruction="""You interpret security questionnaire requirements. Select a control only from supported_controls. Never claim that a requirement passes and never manufacture evidence. If no supported control can verify the requirement, return UNSUPPORTED and explain that TrustFix cannot verify it from the connected Google Cloud environment. Keep decision summaries concise; never expose chain-of-thought.""",
    tools=[supported_controls],
)

