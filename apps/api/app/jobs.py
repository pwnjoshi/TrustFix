import asyncio
import json
import threading

from .config import Settings


def publish(settings: Settings, topic: str, payload: dict) -> str:
    if settings.store_backend == "memory" or not settings.trustfix_platform_project_id:
        from .worker import execute_remediate, execute_scan
        if "scan" in topic:
            threading.Thread(target=execute_scan, args=(payload,), daemon=True).start()
        elif "remediation" in topic:
            threading.Thread(target=lambda: asyncio.run(execute_remediate(payload)), daemon=True).start()
        return f"local-msg-{payload.get('job_id')}"

    from google.cloud import pubsub_v1
    publisher = pubsub_v1.PublisherClient()
    path = publisher.topic_path(settings.trustfix_platform_project_id, topic)
    return publisher.publish(path, json.dumps(payload).encode(), content_type="application/json").result(timeout=20)

