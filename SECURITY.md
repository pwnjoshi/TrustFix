# Security model

TrustFix follows: observe automatically, reason automatically, plan automatically, verify automatically, mutate according to policy.

- Every domain entity is scoped to a workspace and server-side role checks enforce Owner, Admin, Security Reviewer, and Viewer access.
- Scanner and remediator service identities are separated. The API does not inherit remediation permissions.
- Remediations require an action ID, idempotency key, approval decision, expected before-state fingerprint, minimum delta, and post-change verification.
- Unexpected drift aborts execution. A successful API response alone never marks a control verified.
- Credentials are obtained through Application Default Credentials locally and attached Cloud Run service identities in production. Secrets are server-only and stored in Secret Manager.
- Uploaded files are size and content-type limited, parsed outside the browser, and retained under workspace-scoped object names.
- Logs contain correlation identifiers, not tokens, credentials, raw secrets, or hidden model reasoning.
- CSP, frame restrictions, MIME sniffing protection, referrer policy, validation, rate limits, and structured errors are applied at the application edge.

The demo scripts only modify resources whose names and labels identify them as TrustFix demo resources. Do not point remediation at a production project.

