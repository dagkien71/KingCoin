#!/usr/bin/env node
/**
 * E2E: mở futures long/short → admin điều giá → kiểm tra uPnL, NAV, số dư.
 * Yêu cầu: API chạy (npm run dev:all), demo + admin seed.
 *
 * Chạy: node scripts/e2e-futures-nav-flow.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env") });

const API = (process.env.E2E_API_URL ?? "http://localhost:3001/api/v1").replace(
  /\/$/,
  ""
);
const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL ?? "demo@kingcoin.local";
const DEMO_PASS = process.env.E2E_DEMO_PASSWORD ?? "demo12345";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@kingcoin.local";
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD ?? "admin12345";
const MARGIN = Number(process.env.E2E_FUTURES_MARGIN ?? "50");
const LEVERAGE = Number(process.env.E2E_FUTURES_LEVERAGE ?? "10");
const PRICE_BUMP = Number(process.env.E2E_PRICE_BUMP_PCT ?? "0.08");
const TOLERANCE = Number(process.env.E2E_TOLERANCE_KC ?? "2");

const log = (msg) => console.log(`[e2e-futures] ${msg}`);
const fail = (msg) => {
  console.error(`[e2e-futures] FAIL: ${msg}`);
  process.exit(1);
};
const ok = (msg) => log(`OK: ${msg}`);

function unwrap(body) {
  if (body && typeof body === "object" && "data" in body && body.data != null) {
    return body.data;
  }
  return body;
}

function unrealizedPnlKc(side, size, entry, mark) {
  if (side === "long") return size * (mark - entry);
  return size * (entry - mark);
}

function futuresEquityKc(futuresFree, positions) {
  let locked = 0;
  for (const p of positions ?? []) {
    locked += (p.marginKc ?? 0) + (p.unrealizedPnlKc ?? 0);
  }
  return (futuresFree ?? 0) + locked;
}

async function altValueKc(balances, pricesByTokenId, excludeTokenId) {
  let sum = 0;
  for (const t of balances?.tokens ?? []) {
    if (excludeTokenId && t.tokenId === excludeTokenId) continue;
    const px = pricesByTokenId.get(t.tokenId) ?? 0;
    sum += (t.amount ?? 0) * px;
  }
  return sum;
}

async function estimateNavKc(
  balances,
  positions,
  pricesByTokenId,
  excludeTokenId
) {
  const quote = balances?.quoteKc ?? 0;
  const funding = balances?.fundingKc ?? 0;
  const futuresFree = balances?.futuresKc ?? 0;
  const alt = await altValueKc(balances, pricesByTokenId, excludeTokenId);
  const fut = futuresEquityKc(futuresFree, positions);
  return quote + alt + funding + fut;
}

function isRetryable(err) {
  const s = String(err?.message ?? err);
  return s.includes("409") || s.includes("P2034") || s.includes("xung đột");
}

async function api(
  method,
  path,
  { token, body, retries = 0, timeoutMs } = {}
) {
  const max = retries > 0 ? retries : 0;
  const timeout =
    timeoutMs ?? (path.includes("/admin/market-control") ? 90_000 : 30_000);
  let lastErr;
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API}${path}`, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeout),
      });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* ignore */
      }
      if (!res.ok) {
        const msg =
          json?.message ??
          (Array.isArray(json?.message) ? json.message.join(", ") : null) ??
          text?.slice(0, 400) ??
          res.statusText;
        throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
      }
      return unwrap(json);
    } catch (e) {
      lastErr = e;
      if (attempt < max && isRetryable(e)) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function login(email, password) {
  const data = await api("POST", "/auth/login", {
    body: { email, password },
  });
  if (!data?.accessToken) fail(`login ${email}: thiếu accessToken`);
  return data.accessToken;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pickAltToken(adminToken) {
  const markets = await api("GET", "/futures/markets");
  const list = Array.isArray(markets) ? markets : [];
  const alt = list.find(
    (m) =>
      m.futuresEnabled !== false &&
      m.tokenKind !== "stablecoin" &&
      m.symbol !== "KC" &&
      (m.price ?? 0) > 0
  );
  if (!alt?.id) fail("Không tìm thấy cặp futures alt — chạy seed/sync-futures-markets");
  return alt;
}

async function closeAllPositions(userToken) {
  const open = await api("GET", "/futures/positions", { token: userToken });
  for (const p of open ?? []) {
    await api("POST", `/futures/positions/${p.id}/close`, { token: userToken });
    log(`Đã đóng vị thế ${p.side} ${p.symbol ?? p.tokenId}`);
  }
}

async function prismaSetTokenPrice(tokenId, price) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.tokenCrypto.update({
      where: { id: tokenId },
      data: { price },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function adminMoveMark(adminToken, tokenId, targetPrice) {
  await prismaSetTokenPrice(tokenId, targetPrice);
  await api("PATCH", `/admin/market-control/tokens/${tokenId}`, {
    token: adminToken,
    body: { paused: true, forceMid: targetPrice },
    timeoutMs: 20_000,
  });
  await api("POST", `/admin/market-control/tokens/${tokenId}/sync-mid`, {
    token: adminToken,
    timeoutMs: 60_000,
    retries: 2,
  });
}

async function prismaCreditFutures(email, targetFree) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) fail(`Không tìm thấy user ${email}`);
    const bal = await prisma.balance.findUnique({ where: { userId: user.id } });
    if (!bal) fail("Demo chưa có balance");
    const cur = bal.futuresKc ?? 0;
    if (cur >= targetFree) return;
    await prisma.balance.update({
      where: { id: bal.id },
      data: { futuresKc: targetFree },
    });
    ok(`Prisma: futuresKc ${cur} → ${targetFree}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureFuturesBalance(userToken, minKc) {
  const bal = await api("GET", "/users/me/balances", { token: userToken });
  const free = bal?.futuresKc ?? 0;
  if (free >= minKc) return bal;
  const need = Math.ceil(minKc - free + 10);
  const spot = bal?.quoteKc ?? 0;
  if (spot < need && free < minKc) {
    await prismaCreditFutures(DEMO_EMAIL, need);
    return api("GET", "/users/me/balances", { token: userToken });
  }
  try {
    await api("POST", "/wallets/transfer-internal", {
      token: userToken,
      body: { fromWallet: "spot", toWallet: "futures", amount: need },
    });
    ok(`Chuyển ${need} KC spot → futures`);
  } catch (e) {
    if (!String(e.message).includes("404")) throw e;
    await prismaCreditFutures(DEMO_EMAIL, Math.max(need, free + need));
  }
  return api("GET", "/users/me/balances", { token: userToken });
}

async function buildPricesMap(adminToken, primaryTokenId) {
  const dash = await api("GET", "/admin/market-control", { token: adminToken });
  const map = new Map();
  for (const t of dash?.tokens ?? []) {
    if (t.id && t.price > 0) map.set(t.id, t.price);
  }
  if (primaryTokenId) {
    try {
      const mark = await api(
        "GET",
        `/futures/mark-price?tokenId=${primaryTokenId}`,
        { token: adminToken }
      );
      if (mark?.markPrice > 0) map.set(primaryTokenId, mark.markPrice);
    } catch {
      /* dùng giá dashboard */
    }
  }
  return map;
}

async function assertNavMatches(
  userToken,
  adminToken,
  label,
  positions,
  primaryTokenId
) {
  const balances = await api("GET", "/users/me/balances", { token: userToken });
  const prices = await buildPricesMap(
    adminToken,
    primaryTokenId ?? positions[0]?.tokenId
  );
  const estimated = await estimateNavKc(
    balances,
    positions,
    prices,
    primaryTokenId ?? positions[0]?.tokenId
  );
  const me = await api("GET", "/users/me", { token: userToken });
  const baseline = me?.navBaselineDayKc ?? 0;
  const liveDaily = estimated - baseline;
  log(
    `${label}: NAV≈${estimated.toFixed(4)} KC, dailyPnL(live)≈${liveDaily.toFixed(4)}`
  );
  const futuresOnly = futuresEquityKc(
    balances?.futuresKc ?? 0,
    positions
  );
  return { balances, estimated, me, futuresOnly };
}

async function runSideFlow({
  side,
  userToken,
  adminToken,
  token,
  /** true = điều giá theo hướng có lợi cho vị thế (long↑, short↓) */
  favorPosition,
}) {
  const bumpDir =
    side === "long"
      ? favorPosition
        ? "up"
        : "down"
      : favorPosition
        ? "down"
        : "up";

  log(`--- ${side.toUpperCase()} ---`);
  await closeAllPositions(userToken);

  const before = await assertNavMatches(
    userToken,
    adminToken,
    "Trước mở",
    [],
    token.id
  );
  await ensureFuturesBalance(userToken, MARGIN + 20);

  const mark0 = await api("GET", `/futures/mark-price?tokenId=${token.id}`, {
    token: userToken,
  });
  const entryMark = mark0.markPrice;

  const opened = await api("POST", "/futures/orders", {
    token: userToken,
    body: {
      tokenId: token.id,
      side,
      leverage: LEVERAGE,
      marginKc: MARGIN,
    },
  });
  const position = opened?.position ?? opened;
  if (!position?.id) {
    fail(`Mở ${side} không trả position: ${JSON.stringify(opened)?.slice(0, 300)}`);
  }
  ok(`Mở ${side} id=${position.id} entry≈${position.entryPrice}`);

  await sleep(400);
  let positions = await api("GET", "/futures/positions", { token: userToken });
  const pos = positions.find((p) => p.id === position.id) ?? positions[0];
  if (!pos) fail("Không thấy vị thế sau mở");

  const u0 = pos.unrealizedPnlKc ?? 0;
  const notional0 = (pos.size ?? 0) * (pos.entryPrice ?? 0);
  const u0Limit = Math.max(2, notional0 * 0.02);
  if (Math.abs(u0) > u0Limit) {
    fail(
      `uPnL ngay sau mở quá lớn: ${u0} (giới hạn ${u0Limit.toFixed(2)}, notional≈${notional0.toFixed(2)})`
    );
  }

  const afterOpen = await assertNavMatches(
    userToken,
    adminToken,
    "Sau mở",
    positions,
    token.id
  );
  const futDrift = afterOpen.futuresOnly - before.futuresOnly;
  if (futDrift > 1.5) {
    fail(
      `Vốn futures tăng bất thường sau mở (+${futDrift.toFixed(4)}). Trước ${before.futuresOnly} sau ${afterOpen.futuresOnly}`
    );
  }
  if (futDrift < -(TOLERANCE + 1)) {
    fail(
      `Vốn futures giảm quá mức sau mở (${futDrift.toFixed(4)} KC, kỳ vọng ~phí mở)`
    );
  }
  ok(`Vốn futures sau mở ổn (${futDrift.toFixed(4)} KC, gồm phí/ký quỹ)`);

  const factor = side === "long" ? 1 + PRICE_BUMP : 1 - PRICE_BUMP;
  const targetPrice = Number((entryMark * factor).toFixed(8));
  await adminMoveMark(adminToken, token.id, targetPrice);
  ok(`Điều giá ${entryMark} → ${targetPrice} (${bumpDir})`);

  const priceMovedRight = favorPosition;
  let pos2;
  let u1 = 0;
  for (let i = 0; i < 15; i++) {
    positions = await api("GET", "/futures/positions", { token: userToken });
    pos2 = positions.find((p) => p.id === position.id);
    u1 = pos2?.unrealizedPnlKc ?? 0;
    if (pos2 && (!priceMovedRight || u1 > 0.2)) break;
    await sleep(500);
  }
  await api("PATCH", `/admin/market-control/tokens/${token.id}`, {
    token: adminToken,
    body: { paused: false },
  }).catch(() => {});
  if (!pos2) {
    fail(
      `${side}: mất vị thế sau điều giá (id=${position.id}, open=${(positions ?? []).length})`
    );
  }
  if (priceMovedRight && u1 <= 0.2) {
    fail(
      `${side} sau điều giá có lời kỳ vọng nhưng uPnL=${u1}, mark=${pos2?.markPrice}`
    );
  }
  ok(`${side} uPnL sau điều giá = ${u1.toFixed(4)} KC`);

  const afterBump = await assertNavMatches(
    userToken,
    adminToken,
    "Sau điều giá",
    positions,
    token.id
  );
  const futGain = afterBump.futuresOnly - afterOpen.futuresOnly;
  if (priceMovedRight && futGain <= 0.2) {
    fail(
      `Vốn futures không tăng khi ${side} lời: ${afterOpen.futuresOnly} → ${afterBump.futuresOnly}`
    );
  }
  ok(`Vốn futures tăng khi lời: +${futGain.toFixed(4)} KC`);

  const navExclGain = afterBump.estimated - afterOpen.estimated;
  if (priceMovedRight && navExclGain <= 0.01) {
    fail(
      `NAV (trừ bag spot mã test) không tăng khi ${side} lời: ${afterOpen.estimated} → ${afterBump.estimated}`
    );
  }
  ok(`NAV (trừ bag ${token.symbol} spot) +${navExclGain.toFixed(4)} KC`);

  const closed = await api("POST", `/futures/positions/${position.id}/close`, {
    token: userToken,
  });
  ok(`Đóng ${side} realizedPnL=${closed?.realizedPnlKc ?? "?"}`);

  await sleep(400);
  positions = await api("GET", "/futures/positions", { token: userToken });
  if ((positions ?? []).some((p) => p.id === position.id)) {
    fail("Vị thế vẫn open sau close");
  }

  const afterClose = await assertNavMatches(
    userToken,
    adminToken,
    "Sau đóng",
    positions,
    token.id
  );
  if (
    priceMovedRight &&
    afterClose.futuresOnly < afterOpen.futuresOnly - TOLERANCE
  ) {
    fail(
      `Vốn futures sau đóng thấp hơn trước khi bump bất thường: ${afterClose.futuresOnly} vs ${afterBump.futuresOnly}`
    );
  }
  ok(`Hoàn tất flow ${side}`);
}

async function main() {
  log(`API ${API}`);
  try {
    await api("GET", "/health");
  } catch (e) {
    fail(`API không sẵn sàng: ${e.message}`);
  }
  ok("health");

  const userToken = await login(DEMO_EMAIL, DEMO_PASS);
  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASS);
  ok("login demo + admin");

  await api("GET", "/users/me", { token: userToken });
  ok("sync NAV baseline (/users/me)");

  const token = await pickAltToken(adminToken);
  log(`Token: ${token.symbol} (${token.id}) price=${token.price}`);

  await closeAllPositions(userToken);

  await runSideFlow({
    side: "long",
    userToken,
    adminToken,
    token,
    favorPosition: true,
  });
  await runSideFlow({
    side: "short",
    userToken,
    adminToken,
    token,
    favorPosition: true,
  });

  log("PASS — futures NAV / uPnL / điều giá hoạt động đúng.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
