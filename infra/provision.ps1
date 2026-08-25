$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$platformProject = $env:TRUSTFIX_PLATFORM_PROJECT_ID
$targetProject = $env:TRUSTFIX_TARGET_PROJECT_ID
$region = if ($env:GOOGLE_CLOUD_REGION) { $env:GOOGLE_CLOUD_REGION } else { 'us-central1' }
if (-not $platformProject -or -not $targetProject) { throw 'Set TRUSTFIX_PLATFORM_PROJECT_ID and TRUSTFIX_TARGET_PROJECT_ID.' }
if ($platformProject -eq $targetProject) { throw 'Platform and target projects must be different.' }
if ($targetProject -notmatch 'trustfix.*(demo|sandbox|target)' ) { throw 'Target project ID must clearly identify a TrustFix demo/sandbox target.' }
Write-Host "Platform project: $platformProject"
Write-Host "Disposable target: $targetProject"
Write-Host "Region: $region"

$apis = @('aiplatform.googleapis.com','run.googleapis.com','cloudbuild.googleapis.com','cloudresourcemanager.googleapis.com','iap.googleapis.com','artifactregistry.googleapis.com','firestore.googleapis.com','storage.googleapis.com','pubsub.googleapis.com','secretmanager.googleapis.com','logging.googleapis.com','monitoring.googleapis.com')
foreach ($api in $apis) {
  Write-Host "Ensuring platform API: $api"
  gcloud services enable $api --project $platformProject --quiet
}
gcloud artifacts repositories create trustfix --repository-format=docker --location=$region --project=$platformProject 2>$null
gcloud firestore databases create --location=nam5 --project=$platformProject 2>$null
gcloud pubsub topics create trustfix-scan-jobs --project=$platformProject 2>$null
gcloud pubsub topics create trustfix-remediation-jobs --project=$platformProject 2>$null
foreach ($name in @('trustfix-web','trustfix-api','trustfix-scanner','trustfix-remediator','trustfix-worker','trustfix-pubsub-invoker')) {
  gcloud iam service-accounts create $name --display-name=$name --project=$platformProject 2>$null
}

gcloud services enable storage.googleapis.com run.googleapis.com compute.googleapis.com --project $targetProject
gcloud projects add-iam-policy-binding $targetProject --member="serviceAccount:trustfix-scanner@$platformProject.iam.gserviceaccount.com" --role=roles/viewer --condition=None
$scannerRole = gcloud iam roles describe TrustFixStorageScanner --project=$targetProject --format='value(name)' 2>$null
if (-not $scannerRole) {
  gcloud iam roles create TrustFixStorageScanner --project=$targetProject --title='TrustFix Storage Scanner' --permissions='storage.buckets.list,storage.buckets.get,storage.buckets.getIamPolicy,resourcemanager.projects.get' --stage=GA
}
gcloud projects add-iam-policy-binding $targetProject --member="serviceAccount:trustfix-scanner@$platformProject.iam.gserviceaccount.com" --role="projects/$targetProject/roles/TrustFixStorageScanner" --condition=None
Write-Host 'Base resources provisioned. The remediator receives only resource-level grants from the demo setup script.'
