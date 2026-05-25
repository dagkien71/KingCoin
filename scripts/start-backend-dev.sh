#!/usr/bin/env bash
# Khởi động API local :3001 — dùng bởi npm run start:all
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

if curl -sf "http://127.0.0.1:3001/api/v1/health" >/dev/null 2>&1; then
  # Process cũ có thể thiếu route/DTO mới — canary Square feed + imageUrls trong OpenAPI
  square_api_fresh() {
    curl -sf "http://127.0.0.1:3001/api/v1/square/feed" >/dev/null 2>&1 \
      && curl -sf "http://127.0.0.1:3001/docs-json" 2>/dev/null | grep -q '"imageUrls"'
  }
  if square_api_fresh; then
    echo "[backend] API đã chạy tại http://localhost:3001 — giữ process (Ctrl+C để dừng stack)"
    while true; do sleep 3600; done
  fi
  echo "[backend] API đang chạy nhưng build cũ (thiếu Square/imageUrls) — rebuild và khởi động lại..."
  lsof -ti :3001 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

if lsof -ti :3001 >/dev/null 2>&1; then
  echo "[backend] Cổng 3001 đang bận — dừng process cũ hoặc đổi APP_PORT trong backend/.env"
  exit 1
fi

echo "[backend] build..."
npm run build --silent 2>/dev/null || npm run build

echo "[backend] http://localhost:3001 (start:prod)"
exec npm run start:prod
