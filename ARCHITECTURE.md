# TrustFix architecture

TrustFix separates interpretation from enforcement. Gemini and Google ADK interpret natural-language requirements and orchestrate tools; deterministic control code evaluates observable configuration, enforces policy, and performs guarded remediation.

```mermaid
flowchart LR
  B[Browser] --> W[Next.js web]\n+  W --> A[FastAPI / review orchestrator]\n+  A --> ADK[Google ADK + Vertex AI Gemini]\n+  ADK --> C[Typed control tools]\n+  C --> T[Target / demo GCP project]\n+  A <--> F[(Firestore)]\n+  A <--> S[(Cloud Storage evidence)]\n+  A <--> P[Pub/Sub jobs]\n+  A --> L[Cloud Logging / Monitoring]\n+  A --> SM[Secret Manager]\n+  subgraph Platform project\n+    W\n+    A\n+    ADK\n+    F\n+    S\n+    P\n+    L\n+    SM\n+  end\n+  subgraph Isolated target project\n+    T\n+  end
```

The scanner identity is read-only. The remediator identity is used only by the worker after deterministic policy and approval checks. The browser never receives cloud credentials or direct access to privileged operations.

## Review state machine

`Draft → Scanning → Needs attention → Remediation in progress → Ready → Completed`

Every run is resumable through an idempotency key. Evidence and activity are append-oriented and scoped by `workspace_id`.

## Supported controls

- `GCP_STORAGE_PUBLIC_ACCESS`: bucket IAM and public-access-prevention, plus anonymous HTTP verification.
- `GCP_RUN_PUBLIC_INVOKER`: Cloud Run IAM and unauthenticated HTTP verification.
- `GCP_FIREWALL_ADMIN_EXPOSURE`: ingress rules exposing administrative ports to untrusted networks.

