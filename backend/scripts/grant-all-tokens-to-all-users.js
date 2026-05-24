/**
 * Cấp mọi TokenCrypto hiện có cho tất cả user trong DB.
 *
 * Chạy từ backend/:
 *   node scripts/grant-all-tokens-to-all-users.js
 *
 * Biến môi trường (tuỳ chọn):
 *   GRANT_KC_AMOUNT   — số dư tối thiểu KingCoin (mặc định 100000)
 *   GRANT_ALT_AMOUNT  — số dư tối thiểu mỗi alt (mặc định 10000)
 *   QUOTE_TOKEN_NAME  — mặc định KingCoin
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const {
  grantAllTokensToAllUsers,
  QUOTE_TOKEN_NAME,
} = require("./lib/grant-all-tokens");

const prisma = new PrismaClient();

async function main() {
  const kc = process.env.GRANT_KC_AMOUNT ?? "100000";
  const alt = process.env.GRANT_ALT_AMOUNT ?? "10000";

  console.log(`Quote: ${QUOTE_TOKEN_NAME} ≥ ${kc} KC`);
  console.log(`Alt tokens: ≥ ${alt} mỗi mã\n`);

  const { summary, quote, tokens } = await grantAllTokensToAllUsers(prisma);

  console.log(`Token trong DB (${tokens.length}):`);
  for (const t of tokens) {
    const tag =
      quote?.id === t.id
        ? " [quote]"
        : t.tokenKind === "stablecoin"
          ? " [stable]"
          : "";
    console.log(`  - ${t.symbol ?? "?"} (${t.name ?? t.id})${tag}`);
  }

  console.log(`\nUser (${summary.userCount}):`);
  for (const u of summary.perUser) {
    console.log(
      `  ${u.email} (${u.role}): +${u.created} tạo, ${u.updated} cập nhật, ${u.skipped} đã đủ`,
    );
  }

  console.log("\nTổng kết:");
  console.log(`  Balance mới: ${summary.balancesCreated}`);
  console.log(`  BalanceToken tạo: ${summary.rowsCreated}`);
  console.log(`  BalanceToken cập nhật: ${summary.rowsUpdated}`);
  console.log(`  Bỏ qua (đã ≥ mức cấp): ${summary.rowsSkipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
