from .models import PolicyDecision, Risk


class PolicyEngine:
    """Deterministic server-side mutation boundary."""

    def decide(self, control_id: str, risk: Risk, auto_low_risk: bool = False) -> PolicyDecision:
        if control_id == "GCP_FIREWALL_ADMIN_EXPOSURE" or risk in {Risk.HIGH, Risk.CRITICAL}:
            return PolicyDecision.REQUIRE_APPROVAL
        if risk == Risk.LOW and auto_low_risk:
            return PolicyDecision.AUTO_REMEDIATE
        return PolicyDecision.REQUIRE_APPROVAL

