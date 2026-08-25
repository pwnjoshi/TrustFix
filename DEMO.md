# Four-minute TrustFix demo

1. Reset the isolated demo project with `pnpm demo:reset`.
2. Open the Acme Security Review: 46 of 47 questions are verified and one storage control has failed.
3. Open the failed requirement. Show the live bucket IAM evidence granting `allUsers` object viewer.
4. Review the exact delta, impact, rollback, and medium risk. Approve remediation.
5. TrustFix removes only public principals, enables public-access prevention, then performs a fresh IAM read and anonymous object request.
6. Show the anonymous `403`, the control changing to Verified, the generated evidence-backed answer, and the complete audit trail.

The UI has a clearly labelled preview-data mode for local product review. Hackathon acceptance requires `TRUSTFIX_TARGET_PROJECT_ID` and live mode; preview data must not be represented as cloud evidence.

