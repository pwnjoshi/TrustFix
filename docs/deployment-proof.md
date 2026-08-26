# Deployment proof

## Verified environment

| Item | Value |
|---|---|
| Platform project | `trustfix-506602` |
| Disposable target | `trustfix-demo-target` |
| Region | `us-central1` |
| Public site | `trustfix-app-00007-4t7` |
| Public legacy alias | `trustfix-web-00008-k49` |
| Protected workspace | `trustfix-workspace-00005-krz` |
| API | `trustfix-api-00012-z5g` |
| Scanner worker | `trustfix-scanner-worker-00010-dk2` |
| Remediator worker | `trustfix-remediator-worker-00010-2wk` |
| ADK agent | `trustfix-agent-00003-9c4` |
| Gemini model | `gemini-3.5-flash` |
| State | Firestore `(default)` |
| Queue | Pub/Sub authenticated push |

## Authentication architecture

Google IAP protects the workspace service. The browser calls a same-origin Next.js proxy, which uses the protected web service identity to invoke the private API and forwards the signed IAP assertion. The API verifies the assertion against `/projects/1087269593372/locations/us-central1/services/trustfix-workspace`, provisions a tenant workspace, and enforces membership roles server-side.

The private API and workers return 403 to anonymous requests. Pub/Sub uses `trustfix-pubsub-invoker` OIDC tokens to invoke the two worker services. Scanner and remediator workloads run as separate identities. Unsupported mutation messages are persisted as safely failed and acknowledged to prevent poison-message retry storms.

## Verified control procedure

1. Reset only the labeled resources in `trustfix-demo-target`.
2. Start the Firestore-backed review.
3. Observe a Pub/Sub scan job and live Cloud Storage IAM evidence.
4. Approve the persisted remediation plan as Owner/Reviewer.
5. Observe the remediator job remove public principals and enforce Public Access Prevention.
6. Confirm the anonymous proof-object request returns 401, 403, or 404.
7. Confirm the question changes to `VERIFIED` with an evidence-backed answer and activity event.

## Authentication status

The IAP OAuth client is configured and interactive Google login is operational. The marketing site remains public while the workspace remains protected.
