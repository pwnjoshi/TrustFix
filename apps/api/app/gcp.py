from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable
from uuid import uuid4
import httpx

import google.auth
from google.api_core.exceptions import Forbidden, GoogleAPICallError
from google.auth.transport.requests import AuthorizedSession
from google.cloud import storage
from google.cloud import run_v2
from google.cloud import compute_v1

from .controls import fingerprint
from .models import Evidence


PUBLIC_MEMBERS = {"allUsers", "allAuthenticatedUsers"}
DEMO_PREFIX = "trustfix-"


@dataclass(frozen=True)
class AssetInspection:
    """A deterministic security assertion evaluated from Cloud Asset Inventory."""

    asset_types: tuple[str, ...]
    content_type: str
    source: str
    violation: Callable[[dict[str, Any]], bool]
    failing_observation: str
    passing_observation: str


def _path(value: dict[str, Any], *keys: str, default: Any = None) -> Any:
    current: Any = value
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
    return default if current is None else current


def _public_iam(asset: dict[str, Any]) -> bool:
    bindings = _path(asset, "iamPolicy", "bindings", default=[])
    return any(PUBLIC_MEMBERS & set(binding.get("members", [])) for binding in bindings)


def _vm_has_public_ip(asset: dict[str, Any]) -> bool:
    interfaces = _path(asset, "resource", "data", "networkInterfaces", default=[])
    return any(interface.get("accessConfigs") or interface.get("ipv6AccessConfigs") for interface in interfaces)


def _sql_has_public_ip(asset: dict[str, Any]) -> bool:
    return bool(_path(asset, "resource", "data", "settings", "ipConfiguration", "ipv4Enabled", default=False))


def _gke_has_public_control_plane(asset: dict[str, Any]) -> bool:
    private = _path(asset, "resource", "data", "privateClusterConfig", default={})
    authorized = _path(asset, "resource", "data", "masterAuthorizedNetworksConfig", default={})
    return not private.get("enablePrivateEndpoint", False) or not authorized.get("enabled", False)


def _dataproc_has_public_nodes(asset: dict[str, Any]) -> bool:
    return not bool(_path(asset, "resource", "data", "config", "gceClusterConfig", "internalIpOnly", default=False))


def _api_key_unrestricted(asset: dict[str, Any]) -> bool:
    restrictions = _path(asset, "resource", "data", "restrictions", default={})
    return not bool(restrictions)


def _data_access_audit_logs_missing(asset: dict[str, Any]) -> bool:
    audit_configs = _path(asset, "iamPolicy", "auditConfigs", default=[])
    enabled_types = {
        config.get("logType")
        for audit in audit_configs
        for config in audit.get("auditLogConfigs", [])
    }
    return not {"DATA_READ", "DATA_WRITE"}.issubset(enabled_types)


ASSET_INSPECTIONS: dict[str, AssetInspection] = {
    "GCP_SQL_PUBLIC_IP": AssetInspection(("sqladmin.googleapis.com/Instance",), "RESOURCE", "Cloud SQL via Cloud Asset Inventory", _sql_has_public_ip, "Cloud SQL instance has a public IPv4 endpoint.", "Cloud SQL instance has no public IPv4 endpoint."),
    "GCP_KMS_KEY_ROTATION": AssetInspection(("cloudkms.googleapis.com/CryptoKey",), "RESOURCE", "Cloud KMS via Cloud Asset Inventory", lambda a: not bool(_path(a, "resource", "data", "rotationPeriod")), "CryptoKey has no automatic rotation schedule.", "CryptoKey has an automatic rotation schedule."),
    "GCP_IAM_KEYLESS_WORKLOADS": AssetInspection(("iam.googleapis.com/ServiceAccountKey",), "RESOURCE", "Cloud IAM via Cloud Asset Inventory", lambda a: _path(a, "resource", "data", "keyType") == "USER_MANAGED", "User-managed service account key exists.", "No user-managed service account key detected."),
    "GCP_LOGGING_ADMIN_AUDIT": AssetInspection(("cloudresourcemanager.googleapis.com/Project",), "IAM_POLICY", "Cloud Audit Logs via Cloud Asset Inventory", _data_access_audit_logs_missing, "Project IAM audit configuration does not enable Data Read and Data Write logs.", "Project IAM audit configuration enables Data Read and Data Write logs."),
    "GCP_SECRET_MANAGER_ROTATION_IAM": AssetInspection(("secretmanager.googleapis.com/Secret",), "IAM_POLICY", "Secret Manager IAM via Cloud Asset Inventory", _public_iam, "Secret IAM policy grants a public principal access.", "Secret IAM policy contains no public principals."),
    "GCP_GKE_PRIVATE_CLUSTER": AssetInspection(("container.googleapis.com/Cluster",), "RESOURCE", "GKE via Cloud Asset Inventory", _gke_has_public_control_plane, "GKE control plane is public or lacks authorized networks.", "GKE control plane is private and restricted by authorized networks."),
    "GCP_BIGQUERY_PUBLIC_DATASET": AssetInspection(("bigquery.googleapis.com/Dataset",), "IAM_POLICY", "BigQuery IAM via Cloud Asset Inventory", _public_iam, "BigQuery dataset grants access to a public principal.", "BigQuery dataset contains no public IAM principals."),
    "GCP_PUBSUB_PUBLIC_ACCESS": AssetInspection(("pubsub.googleapis.com/Topic", "pubsub.googleapis.com/Subscription"), "IAM_POLICY", "Pub/Sub IAM via Cloud Asset Inventory", _public_iam, "Pub/Sub resource grants access to a public principal.", "Pub/Sub resource contains no public IAM principals."),
    "GCP_FUNCTIONS_PUBLIC_INVOKER": AssetInspection(("cloudfunctions.googleapis.com/Function", "cloudfunctions.googleapis.com/CloudFunction"), "IAM_POLICY", "Cloud Run functions IAM via Cloud Asset Inventory", _public_iam, "Function grants invocation access to a public principal.", "Function contains no public IAM principals."),
    "GCP_ARTIFACT_REGISTRY_PUBLIC_ACCESS": AssetInspection(("artifactregistry.googleapis.com/Repository",), "IAM_POLICY", "Artifact Registry IAM via Cloud Asset Inventory", _public_iam, "Artifact repository grants access to a public principal.", "Artifact repository contains no public IAM principals."),
    "GCP_COMPUTE_PUBLIC_IP": AssetInspection(("compute.googleapis.com/Instance",), "RESOURCE", "Compute Engine via Cloud Asset Inventory", _vm_has_public_ip, "VM has an external IPv4 or IPv6 access configuration.", "VM has no external IP access configuration."),
    "GCP_VPC_FLOW_LOGS": AssetInspection(("compute.googleapis.com/Subnetwork",), "RESOURCE", "VPC via Cloud Asset Inventory", lambda a: not bool(_path(a, "resource", "data", "logConfig", "enable", default=False)), "Subnetwork has VPC Flow Logs disabled.", "Subnetwork has VPC Flow Logs enabled."),
    "GCP_DNS_DNSSEC": AssetInspection(("dns.googleapis.com/ManagedZone",), "RESOURCE", "Cloud DNS via Cloud Asset Inventory", lambda a: _path(a, "resource", "data", "visibility", default="public") == "public" and str(_path(a, "resource", "data", "dnssecConfig", "state", default="off")).lower() != "on", "Public managed zone has DNSSEC disabled.", "Managed zone has DNSSEC enabled or is private."),
    "GCP_REDIS_TRANSIT_ENCRYPTION": AssetInspection(("redis.googleapis.com/Instance", "redis.googleapis.com/Cluster"), "RESOURCE", "Memorystore via Cloud Asset Inventory", lambda a: str(_path(a, "resource", "data", "transitEncryptionMode", default="DISABLED")).upper() in {"DISABLED", "TRANSIT_ENCRYPTION_MODE_UNSPECIFIED"}, "Memorystore instance does not require in-transit encryption.", "Memorystore instance requires in-transit encryption."),
    "GCP_SPANNER_PUBLIC_ACCESS": AssetInspection(("spanner.googleapis.com/Instance", "spanner.googleapis.com/Database"), "IAM_POLICY", "Cloud Spanner IAM via Cloud Asset Inventory", _public_iam, "Spanner resource grants access to a public principal.", "Spanner resource contains no public IAM principals."),
    "GCP_DATAPROC_PRIVATE_NODES": AssetInspection(("dataproc.googleapis.com/Cluster",), "RESOURCE", "Dataproc via Cloud Asset Inventory", _dataproc_has_public_nodes, "Dataproc cluster permits public node IPs.", "Dataproc cluster uses internal-only node IPs."),
    "GCP_API_KEYS_RESTRICTED": AssetInspection(("apikeys.googleapis.com/Key",), "RESOURCE", "API Keys via Cloud Asset Inventory", _api_key_unrestricted, "API key has no application or API restrictions.", "API key has explicit usage restrictions."),
}


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

    def _list_assets(self, asset_types: tuple[str, ...], content_type: str) -> list[dict[str, Any]]:
        credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        session = AuthorizedSession(credentials)
        url = f"https://cloudasset.googleapis.com/v1/projects/{self.project_id}/assets"
        params: list[tuple[str, str | int]] = [("contentType", content_type), ("pageSize", 1000)]
        params.extend(("assetTypes", asset_type) for asset_type in asset_types)
        assets: list[dict[str, Any]] = []
        while True:
            response = session.get(url, params=params, timeout=30)
            if response.status_code == 403:
                raise PermissionGap("cloudasset.assets.listResource", "inspect Cloud Asset Inventory")
            response.raise_for_status()
            payload = response.json()
            assets.extend(payload.get("assets", []))
            page_token = payload.get("nextPageToken")
            if not page_token:
                return assets
            params = [item for item in params if item[0] != "pageToken"]
            params.append(("pageToken", page_token))

    def collect_asset_control(self, workspace_id: str, control_id: str) -> list[Evidence]:
        inspection = ASSET_INSPECTIONS[control_id]
        assets = self._list_assets(inspection.asset_types, inspection.content_type)
        if not assets:
            properties = {"violation": False, "resource_count": 0, "asset_types": list(inspection.asset_types)}
            return [Evidence(workspace_id=workspace_id, control_id=control_id, source=inspection.source, project=self.project_id, resource=self.project_id, resource_identifier=f"projects/{self.project_id}", observation="No resources of this service type exist in the project.", relevant_properties=properties, raw=properties, live=True, verification_status="VERIFIED")]
        evidence: list[Evidence] = []
        for asset in assets:
            violation = inspection.violation(asset)
            name = str(asset.get("name", "unknown-resource"))
            properties = {"violation": violation, "asset_type": asset.get("assetType"), "content_type": inspection.content_type}
            evidence.append(Evidence(workspace_id=workspace_id, control_id=control_id, source=inspection.source, project=self.project_id, resource=name.rsplit("/", 1)[-1], resource_identifier=name, observation=inspection.failing_observation if violation else inspection.passing_observation, relevant_properties=properties, raw=asset, live=True, verification_status="COLLECTED"))
        return evidence

    def verify_asset_inventory(self) -> None:
        """Fail closed unless the scanner can read the shared inventory boundary."""
        self._list_assets(("cloudresourcemanager.googleapis.com/Project",), "RESOURCE")

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
            # A formerly public object can remain in an intermediary cache after IAM is fixed.
            # A unique query and no-cache headers force the verification to test current access.
            response = await client.get(
                url,
                params={"trustfix_verify": uuid4().hex},
                headers={"Cache-Control": "no-cache", "Pragma": "no-cache"},
            )
            return response.status_code


def preview_evidence(workspace_id: str, control_id: str, project_id: str = "trustfix-demo-target") -> list[Evidence]:
    """Explicitly labelled sample observations for local UI review, never acceptance evidence."""
    samples = {
        "GCP_STORAGE_PUBLIC_ACCESS": ("trustfix-public-storage-demo", "gs://trustfix-public-storage-demo", "Public principals have bucket access.", {"public_principals": [{"role": "roles/storage.objectViewer", "members": ["allUsers"]}], "public_access_prevention": "inherited"}),
        "GCP_RUN_PUBLIC_INVOKER": ("trustfix-public-run-demo", f"projects/{project_id}/locations/us-central1/services/trustfix-public-run-demo", "allUsers has roles/run.invoker.", {"all_users_invoker": True}),
        "GCP_FIREWALL_ADMIN_EXPOSURE": ("trustfix-open-ssh-demo", "trustfix-open-ssh-demo", "Internet exposure detected on TCP 22.", {"source_ranges": ["0.0.0.0/0"], "exposed_admin_ports": ["22"], "disabled": False}),
        "GCP_SQL_PUBLIC_IP": ("trustfix-postgres-prod", f"projects/{project_id}/instances/trustfix-postgres-prod", "Public IPv4 network enabled without SSL requirement.", {"has_public_ip": True, "ssl_enforced": False, "violation": True}),
        "GCP_KMS_KEY_ROTATION": ("trustfix-customer-cmek", f"projects/{project_id}/locations/global/keyRings/trustfix-ring/cryptoKeys/trustfix-cmek", "No automatic rotation period configured on CMEK.", {"auto_rotation": False, "rotation_period": None, "violation": True}),
        "GCP_IAM_KEYLESS_WORKLOADS": ("trustfix-deployer-sa", f"projects/{project_id}/serviceAccounts/trustfix-deployer@{project_id}.iam.gserviceaccount.com", "Active user-managed JSON service account key detected.", {"user_managed_keys_count": 2, "keyless": False, "violation": True}),
        "GCP_LOGGING_ADMIN_AUDIT": ("trustfix-audit-config", f"projects/{project_id}", "Admin Activity and Data Access logging active.", {"audit_logs_enabled": True, "violation": False}),
        "GCP_SECRET_MANAGER_ROTATION_IAM": ("trustfix-api-token", f"projects/{project_id}/secrets/trustfix-api-token", "Secret access is restricted to authorized service identities.", {"public_access": False, "version_count": 3, "violation": False}),
        "GCP_GKE_PRIVATE_CLUSTER": ("trustfix-prod-cluster", f"projects/{project_id}/locations/us-central1/clusters/trustfix-prod-cluster", "Kubernetes cluster enforces private node IPs and authorized master CIDRs.", {"public_endpoint": False, "private_nodes": True, "violation": False}),
        "GCP_BIGQUERY_PUBLIC_DATASET": ("trustfix-analytics", f"//bigquery.googleapis.com/projects/{project_id}/datasets/trustfix_analytics", "BigQuery dataset contains no public IAM principals.", {"violation": False}),
        "GCP_PUBSUB_PUBLIC_ACCESS": ("trustfix-events", f"//pubsub.googleapis.com/projects/{project_id}/topics/trustfix-events", "Pub/Sub topic contains no public IAM principals.", {"violation": False}),
        "GCP_FUNCTIONS_PUBLIC_INVOKER": ("trustfix-review-hook", f"//cloudfunctions.googleapis.com/projects/{project_id}/locations/us-central1/functions/trustfix-review-hook", "Function contains no public IAM principals.", {"violation": False}),
        "GCP_ARTIFACT_REGISTRY_PUBLIC_ACCESS": ("trustfix-images", f"//artifactregistry.googleapis.com/projects/{project_id}/locations/us-central1/repositories/trustfix-images", "Artifact repository contains no public IAM principals.", {"violation": False}),
        "GCP_COMPUTE_PUBLIC_IP": ("trustfix-worker-vm", f"//compute.googleapis.com/projects/{project_id}/zones/us-central1-a/instances/trustfix-worker-vm", "VM has no external IP access configuration.", {"violation": False}),
        "GCP_VPC_FLOW_LOGS": ("trustfix-private-subnet", f"//compute.googleapis.com/projects/{project_id}/regions/us-central1/subnetworks/trustfix-private-subnet", "Subnetwork has VPC Flow Logs enabled.", {"violation": False}),
        "GCP_DNS_DNSSEC": ("trustfix-public-zone", f"//dns.googleapis.com/projects/{project_id}/managedZones/trustfix-public-zone", "Public managed zone has DNSSEC enabled.", {"violation": False}),
        "GCP_REDIS_TRANSIT_ENCRYPTION": ("trustfix-cache", f"//redis.googleapis.com/projects/{project_id}/locations/us-central1/instances/trustfix-cache", "Memorystore instance requires in-transit encryption.", {"violation": False}),
        "GCP_SPANNER_PUBLIC_ACCESS": ("trustfix-ledger", f"//spanner.googleapis.com/projects/{project_id}/instances/trustfix-ledger", "Spanner instance contains no public IAM principals.", {"violation": False}),
        "GCP_DATAPROC_PRIVATE_NODES": ("trustfix-analytics-cluster", f"//dataproc.googleapis.com/projects/{project_id}/regions/us-central1/clusters/trustfix-analytics-cluster", "Dataproc cluster uses internal-only node IPs.", {"violation": False}),
        "GCP_API_KEYS_RESTRICTED": ("trustfix-browser-key", f"//apikeys.googleapis.com/projects/{project_id}/locations/global/keys/trustfix-browser-key", "API key has explicit usage restrictions.", {"violation": False}),
    }
    if control_id not in samples:
        return []
    name, identifier, observation, properties = samples[control_id]
    return [Evidence(workspace_id=workspace_id, control_id=control_id, source="PREVIEW DATA — connect a disposable GCP project for live evidence", project=project_id, resource=name, resource_identifier=identifier, observation=observation, relevant_properties=properties, raw=properties, live=False, verification_status="PREVIEW_ONLY")]
