from app.gcp import ASSET_INSPECTIONS, GcpControlAdapter


def _asset(asset_type: str, name: str, data: dict | None = None, iam_policy: dict | None = None):
    return {
        "name": name,
        "assetType": asset_type,
        "resource": {"data": data or {}},
        "iamPolicy": iam_policy or {},
    }


def test_every_asset_control_has_a_registry_entry():
    from app.controls import REGISTRY

    assert set(ASSET_INSPECTIONS).issubset(REGISTRY)
    assert len(REGISTRY) == 20
    assert len({control.service for control in REGISTRY.values()}) == 20


def test_public_iam_resource_becomes_failing_evidence(monkeypatch):
    adapter = GcpControlAdapter("target-project")
    public_dataset = _asset(
        "bigquery.googleapis.com/Dataset",
        "//bigquery.googleapis.com/projects/target-project/datasets/public_data",
        iam_policy={"bindings": [{"role": "roles/bigquery.dataViewer", "members": ["allUsers"]}]},
    )
    monkeypatch.setattr(adapter, "_list_assets", lambda *_: [public_dataset])

    evidence = adapter.collect_asset_control("workspace", "GCP_BIGQUERY_PUBLIC_DATASET")

    assert evidence[0].live is True
    assert evidence[0].relevant_properties["violation"] is True
    assert evidence[0].project == "target-project"


def test_compute_external_ip_and_safe_empty_inventory(monkeypatch):
    adapter = GcpControlAdapter("target-project")
    public_vm = _asset(
        "compute.googleapis.com/Instance",
        "//compute.googleapis.com/projects/target-project/zones/us-central1-a/instances/web",
        {"networkInterfaces": [{"accessConfigs": [{"natIP": "203.0.113.8"}]}]},
    )
    monkeypatch.setattr(adapter, "_list_assets", lambda *_: [public_vm])
    evidence = adapter.collect_asset_control("workspace", "GCP_COMPUTE_PUBLIC_IP")
    assert evidence[0].relevant_properties["violation"] is True

    monkeypatch.setattr(adapter, "_list_assets", lambda *_: [])
    empty = adapter.collect_asset_control("workspace", "GCP_COMPUTE_PUBLIC_IP")
    assert empty[0].relevant_properties == {
        "violation": False,
        "resource_count": 0,
        "asset_types": ["compute.googleapis.com/Instance"],
    }


def test_configuration_rules_detect_insecure_assets():
    insecure = {
        "GCP_SQL_PUBLIC_IP": {"settings": {"ipConfiguration": {"ipv4Enabled": True}}},
        "GCP_KMS_KEY_ROTATION": {},
        "GCP_IAM_KEYLESS_WORKLOADS": {"keyType": "USER_MANAGED"},
        "GCP_GKE_PRIVATE_CLUSTER": {"privateClusterConfig": {"enablePrivateEndpoint": False}},
        "GCP_VPC_FLOW_LOGS": {"logConfig": {"enable": False}},
        "GCP_DNS_DNSSEC": {"visibility": "public", "dnssecConfig": {"state": "off"}},
        "GCP_REDIS_TRANSIT_ENCRYPTION": {"transitEncryptionMode": "DISABLED"},
        "GCP_DATAPROC_PRIVATE_NODES": {"config": {"gceClusterConfig": {"internalIpOnly": False}}},
        "GCP_API_KEYS_RESTRICTED": {},
    }
    for control_id, data in insecure.items():
        asset_type = ASSET_INSPECTIONS[control_id].asset_types[0]
        assert ASSET_INSPECTIONS[control_id].violation(_asset(asset_type, "//example/resource", data)) is True
