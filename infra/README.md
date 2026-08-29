# Google Cloud deployment

TrustFix requires two different projects: a platform project and a disposable target project. The scripts refuse to continue when they are identical.

1. Install Google Cloud CLI and run `gcloud auth login` and `gcloud auth application-default login`.
2. Set `TRUSTFIX_PLATFORM_PROJECT_ID` and `TRUSTFIX_TARGET_PROJECT_ID` in the current shell. The target must be disposable and dedicated to TrustFix.
3. Run `infra/provision.ps1` to configure cloud infrastructure and service identities.
4. Build and deploy with `infra/deploy.ps1` after OAuth and Cloud Run service identities are configured.

The API, scanner, and remediator identities are separate. The provisioner grants the scanner read-only metadata roles and restricts target mutations to the dedicated remediator identity. Review all IAM commands before using them.

