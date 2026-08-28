# TrustFix build status

Updated: 2026-08-26

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
- Production onboarding now explains the exact customer IAM setup, generates a project-specific read-only grant, tests live API access, and blocks completion until that exact project is verified.
- Public demo links are canonical to `thetrustfix.xyz`, workspace entry is the only IAP handoff, signed-out CTAs use `Start for free`, and authenticated workspace pages use `Open workspace`.
- Persistent system-aware light and dark themes cover the marketing site, mobile navigation, onboarding, and authenticated product workspace.
- Theme preference now synchronizes across routes and tabs, survives the public-site to IAP-workspace origin handoff, initializes before paint, and is directly controllable from onboarding.
- Command Center now exposes verified-boundary freshness, supported-control coverage, real-data operator shortcuts, manual refresh, responsive action hierarchy, and theme-correct operational panels.
- Homepage light mode now has a dedicated hero palette across the atmosphere, kinetic headline, CTAs, trust signals, and complete evidence-preview console.
- The interactive-demo CTA now keeps a stable gradient through hover and press states without flashing, while touch devices receive motion-free interactions and mobile-first navigation, content, proof-preview, footer, demo, and workspace layouts.
- Cinematic mobile-first public site, responsive Command Center, assurance score, Agent Mission Control, mobile bottom navigation, and portable Proof Packs.
- Gemini 3.5 Flash migration with ten-case evidence, safety, unsupported-control, and prompt-injection evaluation at 5.0/5.0.
- Poison-message protection: unsupported mutations are refused, recorded as failed safely, and acknowledged without an infinite Pub/Sub retry loop.
- Lint, strict type check, component tests, 18 API tests, 10 agent evaluations, and a 21-route production build all pass.

## Deployed

- Public site: `trustfix-app-00016-ppm`
- Public legacy alias: `trustfix-web-00017-t8g`
- Protected workspace: `trustfix-workspace-00014-x6g`
- API: `trustfix-api-00014-ktl`
- Scanner worker: `trustfix-scanner-worker-00012-p8g`
- Remediator worker: `trustfix-remediator-worker-00012-tfw`
- ADK agent: `trustfix-agent-00003-9c4`
- Pub/Sub subscriptions: `trustfix-scan-push`, `trustfix-remediation-push`

## Authentication

IAP is enabled and the OAuth client is configured. The public marketing site remains accessible without login; workspace routes are protected by Google IAP.

The deployed asynchronous acceptance passes: scan job `SUCCEEDED`, remediation job `SUCCEEDED`, anonymous probe HTTP 403, result `VERIFIED`.

## Intentional safety limit

Storage remediation is enabled and live-tested. Cloud Run and firewall inspection are enabled, but their mutation executors remain disabled until dedicated rollback acceptance tests exist.
