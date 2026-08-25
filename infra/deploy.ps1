$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$project = $env:TRUSTFIX_PLATFORM_PROJECT_ID
$target = $env:TRUSTFIX_TARGET_PROJECT_ID
$iapUser = $env:TRUSTFIX_IAP_USER
$region = if ($env:GOOGLE_CLOUD_REGION) { $env:GOOGLE_CLOUD_REGION } else { 'us-central1' }
if (-not $project -or -not $target -or -not $iapUser) { throw 'Set TRUSTFIX_PLATFORM_PROJECT_ID, TRUSTFIX_TARGET_PROJECT_ID, and TRUSTFIX_IAP_USER.' }
if ($project -eq $target) { throw 'Platform and target projects must be different.' }
$number = gcloud projects describe $project --format='value(projectNumber)'
$apiImage = "$region-docker.pkg.dev/$project/trustfix/api:latest"
$webImage = "$region-docker.pkg.dev/$project/trustfix/web:latest"
$apiUrl = "https://trustfix-api-$number.$region.run.app"
$publicUrl = "https://trustfix-app-$number.$region.run.app"
$legacyPublicUrl = "https://trustfix-web-$number.$region.run.app"
$appUrl = "https://trustfix-workspace-$number.$region.run.app"
$iapAudience = "/projects/$number/locations/$region/services/trustfix-workspace"
$common = "TRUSTFIX_PLATFORM_PROJECT_ID=$project,TRUSTFIX_TARGET_PROJECT_ID=$target,GOOGLE_CLOUD_REGION=$region,FIRESTORE_DATABASE=(default),STORE_BACKEND=firestore,PREVIEW_MODE=false"

gcloud builds submit . --project=$project --config=cloudbuild.api.yaml --substitutions="_IMAGE=$apiImage" --quiet
gcloud builds submit . --project=$project --config=cloudbuild.web.yaml --substitutions="_IMAGE=$webImage" --quiet
gcloud run deploy trustfix-api --image=$apiImage --region=$region --project=$project --service-account="trustfix-api@$project.iam.gserviceaccount.com" --no-allow-unauthenticated --max=2 --concurrency=16 --set-env-vars="$common,AUTH_MODE=iap,TRUSTFIX_IAP_AUDIENCE=$iapAudience,PUBSUB_SCAN_TOPIC=trustfix-scan-jobs,PUBSUB_REMEDIATION_TOPIC=trustfix-remediation-jobs" --quiet
gcloud run deploy trustfix-scanner-worker --image=$apiImage --region=$region --project=$project --service-account="trustfix-scanner@$project.iam.gserviceaccount.com" --no-allow-unauthenticated --max=2 --concurrency=4 --set-env-vars="$common,TRUSTFIX_APP_MODULE=app.worker:app,TRUSTFIX_WORKER_ROLE=scanner" --quiet
gcloud run deploy trustfix-remediator-worker --image=$apiImage --region=$region --project=$project --service-account="trustfix-remediator@$project.iam.gserviceaccount.com" --no-allow-unauthenticated --max=1 --concurrency=2 --set-env-vars="$common,TRUSTFIX_APP_MODULE=app.worker:app,TRUSTFIX_WORKER_ROLE=remediator" --quiet
gcloud run deploy trustfix-workspace --image=$webImage --region=$region --project=$project --service-account="trustfix-web@$project.iam.gserviceaccount.com" --no-allow-unauthenticated --iap --max=2 --concurrency=40 --set-env-vars="API_BASE_URL=$apiUrl,TRUSTFIX_AUTH_MODE=iap,NEXT_PUBLIC_APP_URL=$appUrl,TRUSTFIX_PUBLIC_SITE_MODE=false" --quiet
gcloud run deploy trustfix-app --image=$webImage --region=$region --project=$project --service-account="trustfix-web@$project.iam.gserviceaccount.com" --allow-unauthenticated --no-iap --max=2 --concurrency=40 --set-env-vars="TRUSTFIX_PUBLIC_SITE_MODE=true,TRUSTFIX_PROTECTED_APP_URL=$appUrl,NEXT_PUBLIC_APP_URL=$publicUrl" --quiet
gcloud run deploy trustfix-web --image=$webImage --region=$region --project=$project --service-account="trustfix-web@$project.iam.gserviceaccount.com" --allow-unauthenticated --no-iap --max=2 --concurrency=40 --set-env-vars="TRUSTFIX_PUBLIC_SITE_MODE=true,TRUSTFIX_PROTECTED_APP_URL=$appUrl,NEXT_PUBLIC_APP_URL=$legacyPublicUrl" --quiet
gcloud run services add-iam-policy-binding trustfix-api --project=$project --region=$region --member="serviceAccount:trustfix-web@$project.iam.gserviceaccount.com" --role=roles/run.invoker --quiet
gcloud iap web add-iam-policy-binding --project=$project --resource-type=cloud-run --service=trustfix-workspace --region=$region --member="user:$iapUser" --role=roles/iap.httpsResourceAccessor --quiet
Write-Host "TrustFix public site: $publicUrl"
Write-Host "TrustFix protected app: $appUrl/app"
