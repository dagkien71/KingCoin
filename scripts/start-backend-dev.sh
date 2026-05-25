#!/usr/bin/env bash
# Khởi động API local :3001 — dùng bởi npm run start:all
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

if curl -sf "http://127.0.0.1:3001/api/v1/health" >/dev/null 2>&1; then
  echo "[backend] API đã chạy tại http://localhost:3001 — giữ process (Ctrl+C để dừng stack)"
  while true; do sleep 3600; done
fi

if lsof -ti :3001 >/dev/null 2>&1; then
  echo "[backend] Cổng 3001 đang bận — dừng process cũ hoặc đổi APP_PORT trong backend/.env"
  exit 1
fi

echo "[backend] build..."
npm run build --silent 2>/dev/null || npm run build

echo "[backend] http://localhost:3001 (start:prod)"
exec npm run start:prod
