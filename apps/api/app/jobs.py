import json

from google.cloud import pubsub_v1

from .config import Settings


def publish(settings: Settings, topic: str, payload: dict) -> str:
    if not settings.trustfix_platform_project_id:
        raise RuntimeError("Platform project is not configured")
    publisher = pubsub_v1.PublisherClient()
    path = publisher.topic_path(settings.trustfix_platform_project_id, topic)
    return publisher.publish(path, json.dumps(payload).encode(), content_type="application/json").result(timeout=20)
