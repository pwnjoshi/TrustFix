# Deployment proof

## Verified environment

| Item | Value |
|---|---|
| Platform project | `trustfix-506602` |
| Current verified target | `trustfix-demo-target` |
| Region | `us-central1` |
| Public site | `trustfix-app-00017-n7b` |
| Public legacy alias | `trustfix-web-00018-w8g` |
| Protected workspace | `trustfix-workspace-00015-gtb` |
| API | `trustfix-api-00015-tdw` |
| Scanner worker | `trustfix-scanner-worker-00013-w85` |
| Remediator worker | `trustfix-remediator-worker-00013-kld` |
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

The public domain serves the stable-gradient interactive-demo CTA and mobile-first touch refinements from the same verified image deployed to all three web services. Anonymous workspace access still redirects through IAP, and the protected service retains `minScale=1`.

Light/dark preference is applied before first paint, synchronized across same-origin tabs, and transferred as a non-sensitive one-time query value when the public domain hands the user to the IAP-protected workspace. Onboarding consumes and removes that value, persists the preference on the workspace origin, and exposes the same accessible theme control as the rest of the product.

The production-readiness audit added immutable target-project binding to reviews and filters active control status, findings, approvals, jobs, and activity through the current verified workspace boundary. Visibility-aware 15-second refresh keeps operational pages current without polling hidden tabs. The policy API and UI expose only implemented mutation behavior, and the deployed 10-case ADK evaluation scored 5.0/5.0 with zero errors (`results_20260828_112353`).

## Customer project onboarding

Customers enter the immutable Google Cloud Project ID, grant `roles/viewer` to the displayed keyless TrustFix scanner service account, and run live verification. TrustFix does not mark the integration connected or unlock onboarding until the scanner successfully inspects the exact configured project. Remediation permissions are deliberately separate and are never granted by onboarding.
