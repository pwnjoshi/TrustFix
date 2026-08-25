from __future__ import annotations

from typing import Any
import httpx

from google.api_core.exceptions import Forbidden, GoogleAPICallError
from google.cloud import storage
from google.cloud import run_v2
from google.cloud import compute_v1

from .controls import fingerprint
from .models import Evidence


PUBLIC_MEMBERS = {"allUsers", "allAuthenticatedUsers"}
DEMO_PREFIX = "trustfix-"


class PermissionGap(RuntimeError):
    def __init__(self, permission: str, operation: str):
        super().__init__(f"TrustFix cannot {operation}. Missing permission: {permission}")
        self.permission = permission


def _require_demo_resource(name: str) -> None:
    if not name.startswith(DEMO_PREFIX):
        raise ValueError("Mutation refused: resource is not an explicitly named TrustFix demo resource")


class GcpControlAdapter:
    def __init__(self, project_id: str):
        self.project_id = project_id

    def collect_storage(self, workspace_id: str) -> list[Evidence]:
        client = storage.Client(project=self.project_id)
        evidence: list[Evidence] = []
        try:
            buckets = client.list_buckets(project=self.project_id)
            for bucket in buckets:
                policy = bucket.get_iam_policy(requested_policy_version=3)
                public_bindings = [
                    {"role": role, "members": sorted(set(members) & PUBLIC_MEMBERS)}
                    for role, members in policy.items()
                    if set(members) & PUBLIC_MEMBERS
                ]
                pap = getattr(bucket.iam_configuration, "public_access_prevention", None)
                raw = {"bindings": public_bindings, "public_access_prevention": pap or "inherited"}
                evidence.append(Evidence(workspace_id=workspace_id, control_id="GCP_STORAGE_PUBLIC_ACCESS", source="Google Cloud Storage IAM", project=self.project_id, resource=bucket.name, resource_identifier=f"gs://{bucket.name}", observation="Public principals have bucket access." if public_bindings else "No public principals have bucket access.", relevant_properties={"public_principals": public_bindings, "public_access_prevention": pap or "inherited"}, raw=raw, live=True))
        except Forbidden as exc:
            raise PermissionGap("storage.buckets.getIamPolicy", "inspect bucket IAM") from exc
        return evidence

    def collect_run(self, workspace_id: str, region: str) -> list[Evidence]:
        client = run_v2.ServicesClient()
        parent = f"projects/{self.project_id}/locations/{region}"
        evidence: list[Evidence] = []
        try:
            for service in client.list_services(parent=parent):
                policy = client.get_iam_policy(request={"resource": service.name})
                public = any(b.role == "roles/run.invoker" and "allUsers" in b.members for b in policy.bindings)
                evidence.append(Evidence(workspace_id=workspace_id, control_id="GCP_RUN_PUBLIC_INVOKER", source="Cloud Run IAM", project=self.project_id, resource=service.name.rsplit("/", 1)[-1], resource_identifier=service.name, observation="allUsers has roles/run.invoker." if public else "No public invoker binding.", relevant_properties={"all_users_invoker": public, "uri": service.uri}, raw={"all_users_invoker": public, "uri": service.uri}, live=True))
        except Forbidden as exc:
            raise PermissionGap("run.services.getIamPolicy", "inspect Cloud Run IAM") from exc
        return evidence

    def collect_firewall(self, workspace_id: str) -> list[Evidence]:
        client = compute_v1.FirewallsClient()
        evidence: list[Evidence] = []
        try:
            for rule in client.list(project=self.project_id):
                admin_ports: list[str] = []
                public_source = any(source in {"0.0.0.0/0", "::/0"} for source in rule.source_ranges)
                if public_source and not rule.disabled:
                    for allowed in rule.allowed:
                        if allowed.I_p_protocol.lower() == "tcp":
                            for port in allowed.ports:
                                if port in {"22", "3389"} or port == "0-65535":
                                    admin_ports.append(port)
                raw = {"source_ranges": list(rule.source_ranges), "exposed_admin_ports": admin_ports, "disabled": rule.disabled}
                evidence.append(Evidence(workspace_id=workspace_id, control_id="GCP_FIREWALL_ADMIN_EXPOSURE", source="Compute Engine Firewall API", project=self.project_id, resource=rule.name, resource_identifier=rule.name, observation=f"Internet exposure detected on TCP {', '.join(admin_ports)}." if admin_ports else "No public administrative port exposure.", relevant_properties=raw, raw=raw, live=True))
        except Forbidden as exc:
            raise PermissionGap("compute.firewalls.list", "inspect firewall rules") from exc
        return evidence

    def remediate_storage(self, resource: str, expected_fingerprint: str) -> dict[str, Any]:
        bucket_name = resource.removeprefix("gs://")
        _require_demo_resource(bucket_name)
        bucket = storage.Client(project=self.project_id).bucket(bucket_name)
        policy = bucket.get_iam_policy(requested_policy_version=3)
        public_bindings = [{"role": role, "members": sorted(set(members) & PUBLIC_MEMBERS)} for role, members in policy.items() if set(members) & PUBLIC_MEMBERS]
        before = {"bindings": public_bindings, "public_access_prevention": getattr(bucket.iam_configuration, "public_access_prevention", None) or "inherited"}
        if fingerprint(before) != expected_fingerprint:
            raise RuntimeError("Remediation aborted: bucket IAM drifted after the plan was created")
        changed = False
        for role in list(policy):
            members = set(policy[role])
            filtered = members - PUBLIC_MEMBERS
            if filtered != members:
                policy[role] = filtered
                changed = True
        if changed:
            bucket.set_iam_policy(policy)
        bucket.iam_configuration.public_access_prevention = "enforced"
        bucket.patch()
        return {"changed": changed, "public_access_prevention": "enforced"}

    async def anonymous_storage_probe(self, bucket_name: str, object_name: str = "trustfix-proof.txt") -> int:
        url = f"https://storage.googleapis.com/{bucket_name.removeprefix('gs://')}/{object_name}"
        async with httpx.AsyncClient(follow_redirects=False, timeout=10) as client:
            return (await client.get(url)).status_code


def preview_evidence(workspace_id: str, control_id: str) -> list[Evidence]:
    """Explicitly labelled sample observations for local UI review, never acceptance evidence."""
    samples = {
        "GCP_STORAGE_PUBLIC_ACCESS": ("trustfix-public-storage-demo", "gs://trustfix-public-storage-demo", "Public principals have bucket access.", {"public_principals": [{"role": "roles/storage.objectViewer", "members": ["allUsers"]}], "public_access_prevention": "inherited"}),
        "GCP_RUN_PUBLIC_INVOKER": ("trustfix-public-run-demo", "projects/trustfix-demo-target/locations/us-central1/services/trustfix-public-run-demo", "allUsers has roles/run.invoker.", {"all_users_invoker": True}),
        "GCP_FIREWALL_ADMIN_EXPOSURE": ("trustfix-open-ssh-demo", "trustfix-open-ssh-demo", "Internet exposure detected on TCP 22.", {"source_ranges": ["0.0.0.0/0"], "exposed_admin_ports": ["22"], "disabled": False}),
    }
    name, identifier, observation, properties = samples[control_id]
    return [Evidence(workspace_id=workspace_id, control_id=control_id, source="PREVIEW DATA — connect a disposable GCP project for live evidence", project="trustfix-demo-target (preview)", resource=name, resource_identifier=identifier, observation=observation, relevant_properties=properties, raw=properties, live=False)]
