/**
 * Chạy lúc start trên Render: push schema + seed tối thiểu nếu DB trống.
 */
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

function run(cmd) {
  console.log(`\n[bootstrap] ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: "/app" });
}

async function main() {
  run("npx prisma@6.2.1 db push --skip-generate");

  const prisma = new PrismaClient();
  try {
    const tokenCount = await prisma.tokenCrypto.count();
    console.log(`[bootstrap] tokenCrypto count = ${tokenCount}`);

    if (tokenCount === 0) {
      run("node scripts/reset-seed-10-tokens.js");
      run("node scripts/ensure-market-maker-user.js");
      run("node scripts/ensure-bot-inventory.js");
      run("node scripts/ensure-demo-user-kc.js");
    } else {
      run("node scripts/ensure-kingcoin-token.js");
      run("node scripts/ensure-market-maker-user.js");
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("[bootstrap] done\n");
}

main().catch((err) => {
  console.error("[bootstrap] failed:", err);
  process.exit(1);
});
