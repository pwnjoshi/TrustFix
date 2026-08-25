$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$project = $env:TRUSTFIX_TARGET_PROJECT_ID
if (-not $project -or $project -notmatch 'trustfix.*(demo|sandbox|target)') { throw 'Refusing cleanup: target must clearly be a TrustFix demo project.' }
$bucket = "trustfix-public-storage-demo-$project"
Write-Host "Removing only named TrustFix demo resources from: $project"
gcloud storage rm --recursive "gs://$bucket/**" 2>$null
gcloud storage buckets delete "gs://$bucket" --quiet 2>$null
gcloud compute firewall-rules delete trustfix-open-ssh-demo --project $project --quiet 2>$null
gcloud run services delete trustfix-public-run-demo --region $env:GOOGLE_CLOUD_REGION --project $project --quiet 2>$null
