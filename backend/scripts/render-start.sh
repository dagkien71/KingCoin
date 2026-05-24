#!/bin/sh
cd /app

# Chuẩn hóa DATABASE_URL cho cả bootstrap lẫn Nest (Prisma Mongo cần /dbname)
if [ -n "$DATABASE_URL" ]; then
  export DATABASE_URL="$(node - <<'NODE'
const u = process.env.DATABASE_URL || "";
const db = process.env.DATABASE_NAME || "kingcoin";
if (/^mongodb(?:\+srv)?:\/\/[^/]+\/[^/?]+/.test(u)) {
  process.stdout.write(u);
} else {
  const q = u.includes("?") ? u.slice(u.indexOf("?")) : "";
  const base = u.split("?")[0].replace(/\/$/, "");
  console.warn(`[start] DATABASE_URL thiếu tên DB — dùng /${db}`);
  process.stdout.write(`${base}/${db}${q}`);
}
NODE
)"
fi

node scripts/render-bootstrap.js
exec node dist/main.js
