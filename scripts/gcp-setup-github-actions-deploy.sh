#!/usr/bin/env bash
# Thiết lập một lần: GitHub Actions → deploy Cloud Run khi push master.
# Yêu cầu: gcloud đã login, billing bật trên project.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="${GCP_PROJECT_ID:-app-task-d6072}"
REGION="${GCP_REGION:-asia-southeast1}"
SERVICE="${CLOUD_RUN_SERVICE:-kingcoin-api}"
POOL_ID="${WIF_POOL_ID:-github-pool}"
PROVIDER_ID="${WIF_PROVIDER_ID:-github}"
SA_NAME="${GCP_DEPLOY_SA_NAME:-github-deploy}"

if [[ -z "${GITHUB_REPO:-}" ]]; then
  GITHUB_REPO="$(git remote get-url origin 2>/dev/null | sed -E 's#.*github\.com[:/]([^/]+\/[^/.]+)(\.git)?#\1#' || true)"
fi
if [[ -z "${GITHUB_REPO}" ]]; then
  echo "Đặt GITHUB_REPO=dagkien71/KingCoin (owner/repo)"
  exit 1
fi

echo "Project:     $PROJECT_ID"
echo "GitHub repo: $GITHUB_REPO"
echo "Cloud Run:   $SERVICE ($REGION)"
echo ""

gcloud config set project "$PROJECT_ID" >/dev/null

echo "→ Bật API..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project="$PROJECT_ID"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "→ Tạo service account $SA_EMAIL"
  gcloud iam service-accounts create "$SA_NAME" \
    --project="$PROJECT_ID" \
    --display-name="GitHub Actions deploy Cloud Run"
  echo "   Đợi IAM propagate (10s)..."
  sleep 10
fi

bind_role() {
  local role="$1"
  local n=0
  until gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="$role" \
    --quiet >/dev/null 2>&1; do
    n=$((n + 1))
    if [[ $n -ge 5 ]]; then
      echo "Lỗi gắn role $role cho $SA_EMAIL"
      return 1
    fi
    sleep 5
  done
}

echo "→ Gắn quyền cho SA..."
for role in \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/cloudbuild.builds.editor \
  roles/artifactregistry.writer \
  roles/storage.admin; do
  bind_role "$role"
done

# Cloud Build dùng SA mặc định để deploy Run
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/run.admin" \
  --quiet >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --quiet >/dev/null

if ! gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" --location=global >/dev/null 2>&1; then
  echo "→ Tạo Workload Identity Pool..."
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --display-name="GitHub Actions"
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
  echo "→ Tạo OIDC provider (GitHub)..."
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location=global \
    --workload-identity-pool="$POOL_ID" \
    --display-name="GitHub" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
    --issuer-uri="https://token.actions.githubusercontent.com"
fi

WIF_MEMBER="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"

echo "→ Cho phép repo GitHub dùng SA..."
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="$WIF_MEMBER" \
  --quiet >/dev/null

PROVIDER_FULL="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

echo ""
echo "════════════════════════════════════════════════════════════"
echo " Thêm 3 secrets vào GitHub → Settings → Secrets → Actions:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "GCP_PROJECT_ID"
echo "  $PROJECT_ID"
echo ""
echo "GCP_SERVICE_ACCOUNT"
echo "  $SA_EMAIL"
echo ""
echo "GCP_WORKLOAD_IDENTITY_PROVIDER"
echo "  $PROVIDER_FULL"
echo ""
echo "Sau đó push backend/ lên master → tab Actions → Deploy API (Cloud Run)"
echo "════════════════════════════════════════════════════════════"
