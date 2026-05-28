/**
 * Cấp KC + đúng token được assign cho từng dedicated bot.
 * Mỗi bot-<symbol>-<n>@kingcoin.local chỉ nhận KC và token <symbol> — không cấp tràn lan.
 *
 * Chạy sau seed / khi thêm token mới hoặc bots bị hết số dư:
 *   node scripts/ensure-dedicated-bot-inventory.js
 *
 * Tùy chọn:
 *   SYMBOL=SLR   — chỉ xử lý token có symbol đó
 *   DRY_RUN=true — in kế hoạch, không ghi DB
 */
const { PrismaClient } = require("@prisma/client");
const { slotsForToken, isLegacyBotPool } = require("./lib/token-dedicated-bots");
const { creditBotInventory } = require("./lib/credit-bot-inventory");

const prisma = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "true";
const SYMBOL_FILTER = process.env.SYMBOL?.trim().toUpperCase() || null;

async function listBaseTokens() {
  const quoteName = process.env.QUOTE_TOKEN_NAME?.trim() || "KingCoin";
  const tokens = await prisma.tokenCrypto.findMany({
    where: { status: "active" },
    select: { id: true, name: true, symbol: true, tokenKind: true },
    orderBy: { rank: "asc" },
  });
  return tokens.filter(
    (t) =>
      t.symbol &&
      t.name !== quoteName &&
      t.tokenKind !== "stablecoin" &&
      (!SYMBOL_FILTER || t.symbol.toUpperCase() === SYMBOL_FILTER),
  );
}

async function main() {
  if (isLegacyBotPool()) {
    console.error(
      "Script này dành cho dedicated bot pool. Để dùng legacy pool, chạy ensure-bot-inventory.js",
    );
    process.exit(1);
  }

  const tokens = await listBaseTokens();
  if (tokens.length === 0) {
    console.warn("Không tìm thấy token active nào" + (SYMBOL_FILTER ? ` với SYMBOL=${SYMBOL_FILTER}` : ""));
    return;
  }

  console.log(
    `Dedicated bot inventory: ${tokens.length} token${DRY_RUN ? " [DRY RUN]" : ""}`,
  );

  let totalOk = 0;
  let totalSkip = 0;

  for (const token of tokens) {
    const slots = slotsForToken(token.symbol);
    console.log(`\n── ${token.symbol} (${token.name}) — ${slots.length} bots`);

    for (const slot of slots) {
      if (DRY_RUN) {
        console.log(`  [dry] ${slot.email} (${slot.kind}) → KC + ${token.symbol}`);
        totalOk++;
        continue;
      }

      const r = await creditBotInventory(prisma, {
        email: slot.email,
        baseTokenIdOnly: token.id,
      });

      if (!r.ok) {
        console.warn(`  skip ${slot.email}: ${r.reason}`);
        totalSkip++;
        continue;
      }

      console.log(
        `  ✓ ${slot.email} (${slot.kind}): KC=${r.kcCredited > 0 ? "topped" : "ok"}, ${token.symbol}=${r.baseCredited > 0 ? "topped" : "ok"}`,
      );
      totalOk++;
    }
  }

  console.log(
    `\nKết quả: ${totalOk} bot xử lý, ${totalSkip} skip (user chưa tạo).`,
  );
  if (totalSkip > 0) {
    console.log(
      "→ Chạy node scripts/ensure-liquidity-bots.js trước để tạo user bot còn thiếu.",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
