param(
  [string]$PlatformProject = $env:TRUSTFIX_PLATFORM_PROJECT_ID,
  [string]$TargetProject = $env:TRUSTFIX_TARGET_PROJECT_ID,
  [string]$Region = $(if ($env:GOOGLE_CLOUD_REGION) { $env:GOOGLE_CLOUD_REGION } else { 'us-central1' }),
  [switch]$ConfirmReset
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

if (-not $ConfirmReset) {
  throw 'Reset refused. Re-run with -ConfirmReset after checking the project IDs.'
}
if (-not $PlatformProject -or -not $TargetProject) {
  throw 'Set TRUSTFIX_PLATFORM_PROJECT_ID and TRUSTFIX_TARGET_PROJECT_ID or pass both parameters.'
}
if ($PlatformProject -eq $TargetProject) {
  throw 'Reset refused: platform and target projects must be different.'
}
if ($TargetProject -notmatch '^trustfix-[a-z0-9-]*(demo|sandbox|target)[a-z0-9-]*$') {
  throw "Reset refused: '$TargetProject' is not clearly named as a disposable TrustFix demo target."
}

$bucketName = "trustfix-public-storage-demo-$TargetProject"
if ($bucketName -notmatch '^trustfix-public-storage-demo-') {
  throw 'Reset refused: unexpected bucket name.'
}
$bucketUrl = "gs://$bucketName"
$remediator = "trustfix-remediator@$PlatformProject.iam.gserviceaccount.com"

Write-Host "Resetting the controlled finding in disposable project: $TargetProject"
Write-Host "Demo bucket: $bucketUrl"

gcloud projects describe $PlatformProject --format='value(projectId)' | Out-Null
gcloud projects describe $TargetProject --format='value(projectId)' | Out-Null
gcloud services enable storage.googleapis.com --project=$TargetProject --quiet

$existing = gcloud storage buckets describe $bucketUrl --project=$TargetProject --format='value(name)' 2>$null
if (-not $existing) {
  gcloud storage buckets create $bucketUrl --project=$TargetProject --location=$Region --uniform-bucket-level-access --quiet
}

# The remediator is scoped to this single demo resource, never the target project.
gcloud storage buckets add-iam-policy-binding $bucketUrl --member="serviceAccount:$remediator" --role='roles/storage.admin' --quiet | Out-Null

# Seed the intentionally public object used by the anonymous-access proof.
gcloud storage buckets update $bucketUrl --no-public-access-prevention --quiet | Out-Null
$proofFile = Join-Path ([System.IO.Path]::GetTempPath()) 'trustfix-proof.txt'
try {
  Set-Content -LiteralPath $proofFile -Value 'TrustFix controlled public-access finding. Safe to remediate.' -NoNewline
  gcloud storage cp $proofFile "$bucketUrl/trustfix-proof.txt" --quiet | Out-Null
} finally {
  Remove-Item -LiteralPath $proofFile -Force -ErrorAction SilentlyContinue
}
gcloud storage buckets add-iam-policy-binding $bucketUrl --member='allUsers' --role='roles/storage.objectViewer' --quiet | Out-Null

$policy = gcloud storage buckets get-iam-policy $bucketUrl --format=json | ConvertFrom-Json
$isPublic = @($policy.bindings | Where-Object {
  $_.role -eq 'roles/storage.objectViewer' -and $_.members -contains 'allUsers'
}).Count -gt 0
if (-not $isPublic) {
  throw 'Reset failed: the controlled public IAM binding was not observed.'
}

$cacheBuster = [guid]::NewGuid().ToString('N')
$status = & curl.exe -s -H 'Cache-Control: no-cache' -o NUL -w '%{http_code}' "https://storage.googleapis.com/$bucketName/trustfix-proof.txt?trustfix_verify=$cacheBuster"
if ($status -ne '200') {
  throw "Reset failed: anonymous proof returned HTTP $status instead of 200."
}

Write-Host 'Demo reset verified: controlled object is anonymously readable (HTTP 200).'
Write-Host 'Next: run `uv run python scripts/live_acceptance.py` or start the judge flow in the TrustFix workspace.'
