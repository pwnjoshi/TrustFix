$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$project = $env:TRUSTFIX_TARGET_PROJECT_ID
if (-not $project -or $project -notmatch 'trustfix.*(demo|sandbox|target)') { throw 'Set TRUSTFIX_TARGET_PROJECT_ID to the disposable TrustFix demo project.' }
$bucket = "trustfix-public-storage-demo-$project"
gcloud storage buckets update "gs://$bucket" --no-public-access-prevention
gcloud storage buckets add-iam-policy-binding "gs://$bucket" --member=allUsers --role=roles/storage.objectViewer
gcloud compute firewall-rules update trustfix-open-ssh-demo --project $project --no-disabled
Write-Host 'TrustFix demo resources reset to the intentionally insecure state.'
