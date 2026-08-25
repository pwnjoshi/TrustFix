# Deployment proof

## Verified environment

| Item | Value |
|---|---|
| Platform project | `trustfix-506602` |
| Disposable target | `trustfix-demo-target` |
| Region | `us-central1` |
| Public site | `trustfix-app-00004-db5` |
| Public legacy alias | `trustfix-web-00006-cfh` |
| Protected workspace | `trustfix-workspace-00002-dhw` |
| API | `trustfix-api-00010-xvq` |
| Scanner worker | `trustfix-scanner-worker-00008-4sf` |
| Remediator worker | `trustfix-remediator-worker-00008-kjq` |
| ADK agent | `trustfix-agent-00002-kxd` |
| Gemini model | `gemini-2.5-flash` |
| State | Firestore `(default)` |
| Queue | Pub/Sub authenticated push |

## Authentication architecture

Google IAP protects the web service. The browser calls a same-origin Next.js proxy, which uses the `trustfix-web` service identity to invoke the private API and forwards the signed IAP assertion. The API verifies the assertion against `/projects/1087269593372/locations/us-central1/services/trustfix-web`, provisions a tenant workspace, and enforces membership roles server-side.

The private API and workers return 403 to anonymous requests. Pub/Sub uses `trustfix-pubsub-invoker` OIDC tokens to invoke the two worker services. Scanner and remediator workloads run as separate identities.

## Verified control procedure

1. Reset only the labeled resources in `trustfix-demo-target`.
2. Start the Firestore-backed review.
3. Observe a Pub/Sub scan job and live Cloud Storage IAM evidence.
4. Approve the persisted remediation plan as Owner/Reviewer.
5. Observe the remediator job remove public principals and enforce Public Access Prevention.
6. Confirm the anonymous proof-object request returns 401, 403, or 404.
7. Confirm the question changes to `VERIFIED` with an evidence-backed answer and activity event.

## Current one-time requirement

Because `trustfix-506602` is outside a Google Cloud organization, Google requires the first IAP OAuth client to be created manually. The service is deployed with IAP enabled, but interactive login cannot complete until that client is applied at project-level IAP settings.
