# Tự deploy Cloud Run khi push GitHub

Push code lên `master` (thư mục `backend/`) → GitHub Actions build & deploy service **`kingcoin-api`** lên Cloud Run.

Workflow: [`.github/workflows/deploy-cloud-run.yml`](../.github/workflows/deploy-cloud-run.yml)

> **Lưu ý:** Push GitHub **không** tự build Cloud Run nếu chưa làm bước thiết lập bên dưới (chỉ có CI test trong `ci.yml`).

---

## Bước 1 — Chạy script thiết lập GCP (một lần)

Trên máy đã cài `gcloud` và login đúng project:

```bash
cd /path/to/KingCoin
chmod +x scripts/gcp-setup-github-actions-deploy.sh
./scripts/gcp-setup-github-actions-deploy.sh
```

Script sẽ:

- Bật API cần thiết (Cloud Run, Cloud Build, Artifact Registry, IAM Credentials)
- Tạo service account `github-deploy@…`
- Gắn quyền deploy
- Tạo **Workload Identity Federation** (GitHub → GCP, không cần file JSON key)
- In ra 3 giá trị để dán vào GitHub Secrets

Tuỳ chọn biến môi trường trước khi chạy:

| Biến | Mặc định |
|------|----------|
| `GCP_PROJECT_ID` | `app-task-d6072` |
| `GITHUB_REPO` | remote `origin` (vd `dagkien71/KingCoin`) |
| `GCP_REGION` | `asia-southeast1` |
| `CLOUD_RUN_SERVICE` | `kingcoin-api` |

---

## Bước 2 — GitHub Secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Ví dụ |
|--------|--------|
| `GCP_PROJECT_ID` | `app-task-d6072` |
| `GCP_SERVICE_ACCOUNT` | `github-deploy@app-task-d6072.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github` |

(Copy chính xác từ output script.)

---

## Bước 3 — Kiểm tra

1. Push một thay đổi nhỏ trong `backend/` lên `master`
2. Tab **Actions** trên GitHub → workflow **Deploy API (Cloud Run)**
3. Xong (~5–10 phút) → `GET https://kingcoin-api-….run.app/api/v1/health`

Deploy thủ công: **Actions** → **Deploy API (Cloud Run)** → **Run workflow**.

---

## Env trên Cloud Run

Workflow **không** ghi đè biến môi trường đã set trên Cloud Run (DATABASE_URL, JWT, MM, …). Chỉ đổi **image/code** revision mới.

Đổi env lần đầu hoặc thêm biến:

```bash
gcloud run services update kingcoin-api \
  --project=app-task-d6072 \
  --region=asia-southeast1 \
  --update-env-vars="KEY=value"
```

---

## Frontend (Vercel)

Vercel thường **tự build** khi push `master` nếu repo đã kết nối. Đảm bảo env:

- `NEXT_PUBLIC_API_URL=https://kingcoin-api-534852802829.asia-southeast1.run.app/api/v1`
- `NEXT_PUBLIC_API_ORIGIN=https://kingcoin-api-534852802829.asia-southeast1.run.app`

---

## Sự cố

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Workflow không chạy | Chỉ chạy khi đổi `backend/**` hoặc file workflow; hoặc dùng Run workflow |
| Lỗi permission denied | Chạy lại script bước 1; kiểm tra 3 secrets |
| Build Docker lỗi | Xem log step Deploy; test local `cd backend && docker build .` |
| Health OK nhưng API lỗi DB | Kiểm tra `DATABASE_URL` trên Cloud Run console |
