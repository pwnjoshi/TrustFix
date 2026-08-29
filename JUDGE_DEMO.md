# TrustFix judge demo

## Three-minute flow

**0:00–0:25 — Problem.** “Cloud security reviews are slow because evidence is scattered across services, spreadsheets, and tickets. TrustFix turns a review into a live, evidence-backed control decision.”

**0:25–0:50 — Scope.** Open the dashboard and point out the 20 controls spanning identity, data, network, compute, operations, and AI. Say: “This is a real scan of a disposable Google Cloud project, not a hard-coded screenshot.”

**0:50–1:25 — Scan.** Start the guided review. Show the control coverage and the public Cloud Storage finding. Open its evidence to show the resource identifier, public principal, collection source, and live-evidence marker.

**1:25–2:10 — Safe fix.** Open the generated remediation plan. Emphasize that TrustFix separates scanner and remediator identities, checks the evidence fingerprint for drift, requires approval, and only permits mutations on explicitly named demo resources. Approve the Storage fix.

**2:10–2:35 — Verification.** Show that TrustFix removes the public binding, enforces public-access prevention, probes the object anonymously, and records the denied HTTP result. Refresh the control to show `VERIFIED`.

**2:35–3:00 — Proof.** Export the Proof Pack and show its SHA-256 digest. Close with: “TrustFix does not just report posture. It connects requirements to live evidence, proposes a bounded fix, verifies the outcome independently, and leaves an auditable proof trail.”

## Reset before every rehearsal

From the repository root:

```powershell
$env:TRUSTFIX_PLATFORM_PROJECT_ID='trustfix-506602'
$env:TRUSTFIX_TARGET_PROJECT_ID='trustfix-demo-target'
$env:GOOGLE_CLOUD_REGION='us-central1'
.\infra\reset-demo.ps1 -ConfirmReset
```

The reset is intentionally narrow: it only creates or modifies `gs://trustfix-public-storage-demo-trustfix-demo-target`, grants the TrustFix remediator access to that bucket, uploads `trustfix-proof.txt`, and adds the controlled `allUsers` viewer binding.

## 30-second pitch

“TrustFix is an agentic Google Cloud security reviewer. It maps review questions to 20 cloud controls, collects live evidence across the environment, identifies gaps, and creates explainable remediation plans. For safe demo resources, an approved fix is executed with a least-privilege remediator, checked against drift, and independently verified. Every review ends with a tamper-evident Proof Pack, so teams move from questionnaire to verified outcome in minutes.”

## Acceptance checklist

- The public proof object returns HTTP 200 before the demo.
- A full scan completes and evaluates all 20 controls; unsupported or permission-limited services are shown honestly.
- Exactly one controlled Storage remediation plan is selected.
- Remediation succeeds and the anonymous probe returns 401, 403, or 404.
- The Storage control becomes `VERIFIED` and the Proof Pack digest is visible.
- The public site and protected workspace both load from their Cloud Run URLs.
