import os
from collections import defaultdict
from typing import Any

from google.cloud import firestore
from pydantic import BaseModel

from .models import ActivityEvent, Approval, ControlResult, Evidence, Job, PolicySettings, RemediationPlan, Review, User, Workspace, WorkspaceInvitation, WorkspaceMember


MODEL_TYPES = {model.__name__: model for model in (ActivityEvent, Approval, ControlResult, Evidence, Job, PolicySettings, RemediationPlan, Review, User, Workspace, WorkspaceInvitation, WorkspaceMember)}


def _encode(value: Any) -> Any:
    if isinstance(value, BaseModel):
        return {**value.model_dump(mode="json"), "_model": value.__class__.__name__}
    return value


def _decode(value: Any | None) -> Any | None:
    if not isinstance(value, dict) or "_model" not in value:
        return value
    payload = {key: item for key, item in value.items() if key != "_model"}
    return MODEL_TYPES[value["_model"]].model_validate(payload)


class MemoryStore:
    """Development adapter matching the Firestore repository boundary."""

    def __init__(self) -> None:
        self.collections: dict[str, dict[str, Any]] = defaultdict(dict)
        self.idempotency: dict[str, Any] = {}

    def put(self, collection: str, key: str, value: Any) -> None:
        self.collections[collection][key] = value

    def get(self, collection: str, key: str) -> Any | None:
        return self.collections[collection].get(key)

    def list(self, collection: str) -> list[Any]:
        return list(self.collections[collection].values())


class FirestoreStore:
    def __init__(self) -> None:
        database = os.environ.get("FIRESTORE_DATABASE", "(default)")
        options = {"project": os.environ.get("TRUSTFIX_PLATFORM_PROJECT_ID")}
        if database != "(default)":
            options["database"] = database
        self.client = firestore.Client(**options)
        if database == "(default)" and "%28default%29" in self.client._database_string:
            self.client._database_string_internal = f"projects/{self.client.project}/databases/(default)"

    def put(self, collection: str, key: str, value: Any) -> None:
        self.client.collection(collection).document(key).set(_encode(value))

    def get(self, collection: str, key: str) -> Any | None:
        snapshot = self.client.collection(collection).document(key).get()
        return _decode(snapshot.to_dict()) if snapshot.exists else None

    def list(self, collection: str) -> list[Any]:
        return [_decode(snapshot.to_dict()) for snapshot in self.client.collection(collection).stream()]


store = FirestoreStore() if os.environ.get("STORE_BACKEND", "memory").lower() == "firestore" else MemoryStore()
