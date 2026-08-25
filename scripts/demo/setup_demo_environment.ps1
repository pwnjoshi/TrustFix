$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$project = $env:TRUSTFIX_TARGET_PROJECT_ID
$region = if ($env:GOOGLE_CLOUD_REGION) { $env:GOOGLE_CLOUD_REGION } else { 'us-central1' }
if (-not $project -or $project -notmatch 'trustfix.*(demo|sandbox|target)') { throw 'Set TRUSTFIX_TARGET_PROJECT_ID to a disposable TrustFix demo project.' }
if ($project -eq $env:TRUSTFIX_PLATFORM_PROJECT_ID) { throw 'The target must be different from the platform project.' }
$bucket = "trustfix-public-storage-demo-$project"
Write-Host "Creating intentionally vulnerable resources only in: $project"
$existingBucket = gcloud storage buckets list --project $project --filter="name=$bucket" --format='value(name)'
if (-not $existingBucket) {
  gcloud storage buckets create "gs://$bucket" --project $project --location $region --uniform-bucket-level-access
}
gcloud storage buckets update "gs://$bucket" --update-labels=trustfix-demo=true
$proofFile = Join-Path $PSScriptRoot 'trustfix-proof.txt'
gcloud storage cp $proofFile "gs://$bucket/trustfix-proof.txt"
gcloud storage buckets add-iam-policy-binding "gs://$bucket" --member=allUsers --role=roles/storage.objectViewer
$existingFirewall = gcloud compute firewall-rules list --project $project --filter='name=trustfix-open-ssh-demo' --format='value(name)'
if (-not $existingFirewall) {
  gcloud compute firewall-rules create trustfix-open-ssh-demo --project $project --network default --direction INGRESS --action ALLOW --rules tcp:22 --source-ranges 0.0.0.0/0 --target-tags trustfix-demo --description 'Intentionally vulnerable TrustFix demo resource'
}
Write-Host 'Storage and firewall demo resources created. Cloud Run demo setup requires a demo image and is handled after Artifact Registry deployment.'
