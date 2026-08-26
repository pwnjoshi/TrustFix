# TrustFix four-minute demo runbook

## Before recording

1. Run the full quality and ADK evaluation suites.
2. Reset `trustfix-demo-target` to the intentionally vulnerable state.
3. Confirm public and protected URLs in a clean browser.
4. Confirm the signed-in workspace targets `trustfix-demo-target`.
5. Open Cloud Run and Cloud Logging in background tabs.
6. Disable notifications and use a 1440×900 recording viewport.

## 0:00–0:25 — Problem

“Security questionnaires ask organizations to make claims. Existing AI can make those claims sound convincing, but it cannot prove they match the real environment. TrustFix makes the answer true and attaches the proof.”

Show the public hero and the question → finding → verified visualization.

## 0:25–0:45 — Architecture

Show the README architecture diagram.

“Gemini 3.5 and Google ADK interpret requirements. Deterministic controls inspect Google Cloud. Pub/Sub workers run asynchronously. Firestore preserves evidence. Scanner and remediator identities are separate, and Google IAP protects the workspace.”

## 0:45–2:50 — Unedited live workflow

1. Open the protected Command Center.
2. Show the connected disposable target.
3. Open the customer review.
4. Start the live assurance run.
5. Show Agent Mission Control progressing.
6. Open the public-storage failure and its evidence.
7. Open the remediation plan.
8. Explain the exact delta, impact, rollback, and drift fingerprint.
9. Approve the remediation.
10. Watch the worker execute and independently verify anonymous access.
11. Show the question change to Verified.
12. Download the Proof Pack.

Narration anchor: “The agent does not treat an API success response as proof. It performs the anonymous access test and records HTTP 403.”

## 2:50–3:25 — Production proof

Show:

- Activity audit trail.
- Before/after evidence.
- Cloud Run services in the Google Cloud console.
- A correlated worker log entry.
- Separate scanner and remediator service identities.

## 3:25–4:00 — Close

“TrustFix removes the manual work between a customer question and a defensible security answer. It inspects, decides, fixes, verifies, and proves—autonomously, but within explicit human and cloud boundaries.”

End on the verified result and TrustFix logo.

## Recovery path

If the live target is slow, keep recording and show the Mission Control job continuing asynchronously. Do not substitute preview data without clearly labeling it. If remediation already ran, reset the disposable environment and start a new recording from the beginning.
