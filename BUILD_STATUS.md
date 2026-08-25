# TrustFix build status

Updated: 2026-08-25

## Completed

- Responsive Next.js product and FastAPI control plane.
- Google IAP authentication boundary and signed IAP assertion verification at the API.
- First-login user, workspace, membership, and Owner-role provisioning.
- Firestore persistence for users, workspaces, memberships, reviews, evidence, remediation plans, approvals, jobs, actions, and activity.
- Same-origin server proxy with Cloud Run service-to-service authentication; no privileged browser credentials.
- Pub/Sub asynchronous scan and remediation jobs with OIDC-authenticated push.
- Separate scanner and remediator Cloud Run workers with restricted service identities.
- Storage drift precondition, minimum-change remediation, Public Access Prevention, anonymous verification, and evidence-backed answer.
- Private API and ADK agent; Cloud Trace and privacy-preserving logging.
- CSV/XLSX import/export, sandbox setup/reset/destroy, and live storage acceptance utility.
- Public marketing pages hand off to the IAP-protected workspace with full-page navigation, preventing protected API responses from being parsed as public-page JSON.
- Workspace-scoped Google Cloud target selection, validation, verification, and durable onboarding completion.
- Lint, strict type check, 15 tests, production build, and two-case ADK evaluation at 5.0/5.0.

## Deployed

- Public site: `trustfix-app-00004-db5`
- Public legacy alias: `trustfix-web-00006-cfh`
- Protected workspace: `trustfix-workspace-00002-dhw`
- API: `trustfix-api-00010-xvq`
- Scanner worker: `trustfix-scanner-worker-00008-4sf`
- Remediator worker: `trustfix-remediator-worker-00008-kjq`
- `trustfix-agent-00002-kxd`
- Pub/Sub subscriptions: `trustfix-scan-push`, `trustfix-remediation-push`

## Authentication

IAP is enabled and the OAuth client is configured. The public marketing site remains accessible without login; workspace routes are protected by Google IAP.

The deployed asynchronous acceptance passes: scan job `SUCCEEDED`, remediation job `SUCCEEDED`, anonymous probe HTTP 403, result `VERIFIED`.

## Intentional safety limit

Storage remediation is enabled and live-tested. Cloud Run and firewall inspection are enabled, but their mutation executors remain disabled until dedicated rollback acceptance tests exist.
