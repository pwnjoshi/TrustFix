# TrustFix — Hackathon submission

## Track

**The Taskmaster** — TrustFix performs a complete asynchronous security-assurance workflow and takes governed action instead of only generating text.

## One-line pitch

TrustFix is an autonomous cloud assurance agent that checks whether security claims are true, safely repairs discrepancies, and exports proof.

## Problem

Customer security questionnaires force teams to make claims about infrastructure. Existing automation searches documentation and drafts text, but it cannot establish whether the current cloud environment matches the answer. Engineers then manually inspect resources, coordinate fixes, retest access, and assemble evidence.

## Solution and value

TrustFix interprets each requirement with Gemini, maps supported requirements to deterministic Google Cloud controls, gathers live evidence, routes minimum-change remediation for approval, executes asynchronously through a dedicated worker, independently verifies the result, and generates a portable Proof Pack. It turns an error-prone multi-team process into one visible, auditable operating loop.

## Technologies

Gemini 3.5 Flash, Google ADK, Agents CLI, Vertex AI, Cloud Run, Firestore, Pub/Sub, Google IAP, Cloud IAM, Cloud Logging, Cloud Trace, Next.js, FastAPI, Terraform, Vitest, Pytest, Playwright.

## Data sources

- Google Cloud Storage IAM and anonymous object access.
- Cloud Run IAM policies.
- Compute Engine firewall rules.
- CSV/XLSX questionnaire files uploaded by the user.
- TrustFix-generated evidence, approval, execution, and audit records in Firestore.

## Demonstrated autonomous workflow

1. Requirement interpretation.
2. Control selection.
3. Background cloud inspection.
4. Evidence normalization.
5. Deterministic evaluation.
6. Minimum-change planning.
7. Policy and human approval.
8. Drift-protected remediation.
9. Independent anonymous verification.
10. Evidence-backed answer and Proof Pack.

## Production readiness

- Public and protected Cloud Run services.
- Separate scanner and remediator service accounts.
- Platform and target project separation.
- Workspace-scoped Firestore records.
- Pub/Sub asynchronous jobs.
- IAP authentication and backend assertion verification.
- Idempotency, approval, rollback description, drift protection, and audit history.
- Responsive product UI, failure states, and automated tests.

## Findings and learnings

The most important architectural decision was separating interpretation from truth. Gemini handles ambiguous language; deterministic code evaluates measurable cloud properties. A second key learning was that remediation is incomplete until the original property is independently re-tested.

## Final compliance checklist

- [ ] Confirm participant and country eligibility in the binding Official Rules.
- [x] Taskmaster track selected.
- [x] Gemini 3.5 or newer configured.
- [x] Google ADK used.
- [x] Multiple Google Cloud services deployed.
- [x] Hosted project URL available.
- [x] Public repository available.
- [x] Reproducible spin-up instructions documented.
- [x] Architecture diagram included.
- [ ] Record and upload approximately four-minute demo video.
- [ ] Show Cloud Run URL/dashboard and production logs in the video.
- [ ] Verify all live URLs from a clean browser immediately before submission.
- [ ] Publish optional technical article with required hackathon statement.
- [ ] Publish optional social post with `#AllThingsAgenticHackathon`.
- [ ] Submit before the Devpost deadline after reconfirming it on the official page.
