$ErrorActionPreference = 'Stop'
$project = $env:TRUSTFIX_PLATFORM_PROJECT_ID
if (-not $project -or $project -notmatch 'trustfix') { throw 'Refusing cleanup: TRUSTFIX_PLATFORM_PROJECT_ID must be explicit and contain trustfix.' }
Write-Host "This removes TrustFix Cloud Run services and topics from: $project"
foreach ($service in @('trustfix-web','trustfix-api','trustfix-worker')) { gcloud run services delete $service --region $env:GOOGLE_CLOUD_REGION --project $project --quiet 2>$null }
foreach ($topic in @('trustfix-scan-jobs','trustfix-remediation-jobs')) { gcloud pubsub topics delete $topic --project $project --quiet 2>$null }

