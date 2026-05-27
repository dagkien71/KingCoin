#!/usr/bin/env bash
# Chuẩn bị DB + seed, rồi gợi ý chạy API/UI (cần Docker).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/backend"

PRISMA_VERSION="6.19.3"

clean_node_modules() {
  if [[ -d node_modules ]]; then
    chmod -R u+w node_modules 2>/dev/null || true
    rm -rf node_modules
  fi
}

install_backend_deps() {
  if [[ -f node_modules/@prisma/client/package.json ]] && [[ -x node_modules/.bin/prisma ]]; then
    return 0
  fi
  echo "==> npm install (backend — cần @prisma/client + prisma CLI)..."
  if ! npm install; then
    echo "==> npm install lỗi — xóa node_modules và thử lại..."
    clean_node_modules
    npm install
  fi
  if [[ ! -f node_modules/@prisma/client/package.json ]]; then
    echo "ERROR: Thiếu @prisma/client sau npm install."
    echo "  cd backend && chmod -R u+w node_modules 2>/dev/null; rm -rf node_modules && npm install"
    exit 1
  fi
}

prisma_generate() {
  if [[ -x node_modules/.bin/prisma ]]; then
    npm exec prisma generate
  else
    npx --yes "prisma@${PRISMA_VERSION}" generate
  fi
}

install_backend_deps

echo "==> Starting MongoDB (docker-compose.dev.yml)..."
docker compose -f docker-compose.dev.yml up -d

echo "==> Waiting for Mongo..."
for i in $(seq 1 30); do
  if docker compose -f docker-compose.dev.yml exec -T mongo-dev mongosh --port 27018 --quiet --eval "db.runCommand({ ping: 1 })" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Replica set (init nếu chưa có)..."
docker compose -f docker-compose.dev.yml exec -T mongo-dev mongosh --port 27018 --quiet --eval '
  let s;
  try { s = rs.status(); } catch (e) { s = null; }
  if (!s || s.ok !== 1) {
    rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27018"}]});
    print("initiated");
  } else {
    print("already ok");
  }
' || true

export DATABASE_URL="${DATABASE_URL:-mongodb://127.0.0.1:27018/starter?replicaSet=rs0}"

PUSH_FLAGS=(db push --skip-generate)
if [[ -x node_modules/.bin/prisma ]]; then
  echo "==> prisma db push (local ${PRISMA_VERSION})..."
  npm exec prisma "${PUSH_FLAGS[@]}"
else
  echo "==> prisma db push (npx prisma@${PRISMA_VERSION})..."
  npx --yes "prisma@${PRISMA_VERSION}" "${PUSH_FLAGS[@]}"
fi

echo "==> prisma generate (@prisma/client)..."
prisma_generate

echo "==> Seed demo (skip nếu đã có token)..."
node scripts/seed-demo-token.js

echo "==> Token sắp niêm yết (countdown)..."
node scripts/seed-upcoming-listings.js

echo "==> Đồng bộ KingCoin (KC) — phát hành 1.000.000 token..."
node scripts/ensure-kingcoin-token.js

echo "==> Bot thanh khoản (local: 22 MM + 14 flow — mm1@… flow1@…)..."
node scripts/ensure-liquidity-bots.js

echo "==> User-bot (taker market) — user-bot@kingcoin.local..."
node scripts/ensure-user-bot.js

echo "==> Đồng bộ kho token base cho MM + flow..."
node scripts/ensure-bot-inventory.js

echo "==> Demo user KC (demo@kingcoin.local)..."
node scripts/ensure-demo-user-kc.js

echo "==> Dọn lệnh pending cũ (trước escrow)..."
node scripts/cancel-stale-pending-orders.js

echo "==> Build backend (cho npm run start:all)..."
npm run build --silent 2>/dev/null || npm run build

echo ""
echo "OK — Mongo + schema + seed."
echo "Market maker (dev): mặc định BẬT khi chạy API — tắt bằng MARKET_MAKER_ENABLED=false trong backend/.env."
echo "Chạy API + web (một lệnh, từ gốc repo):"
echo "  npm install && npm run start:all"
echo "Hoặc hai terminal:"
echo "  cd backend  && npm run start:dev"
echo "  cd frontend && npm run dev"
echo ""
echo "  API:  http://localhost:3001/api/v1"
echo "  Web: http://localhost:3000"
