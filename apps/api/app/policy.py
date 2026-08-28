from .models import PolicyDecision, PolicySettings, Risk


class PolicyEngine:
    """Deterministic server-side mutation boundary."""

    def __init__(self, settings: PolicySettings | None = None):
        self.settings = settings

    def decide(self, control_id: str, risk: Risk, auto_low_risk: bool = False) -> PolicyDecision:
        configured = {
            "GCP_STORAGE_PUBLIC_ACCESS": self.settings.storage if self.settings else PolicyDecision.REQUIRE_APPROVAL,
            "GCP_RUN_PUBLIC_INVOKER": self.settings.cloud_run if self.settings else PolicyDecision.REQUIRE_APPROVAL,
            "GCP_FIREWALL_ADMIN_EXPOSURE": self.settings.firewall if self.settings else PolicyDecision.REQUIRE_APPROVAL,
        }.get(control_id, PolicyDecision.MANUAL_ONLY)
        if configured == PolicyDecision.MANUAL_ONLY:
            return configured
        if control_id in {"GCP_RUN_PUBLIC_INVOKER", "GCP_FIREWALL_ADMIN_EXPOSURE"}:
            return PolicyDecision.MANUAL_ONLY
        if risk in {Risk.HIGH, Risk.CRITICAL}:
            return PolicyDecision.REQUIRE_APPROVAL
        if configured == PolicyDecision.AUTO_REMEDIATE and risk == Risk.LOW and auto_low_risk:
            return PolicyDecision.AUTO_REMEDIATE
        return PolicyDecision.REQUIRE_APPROVAL
