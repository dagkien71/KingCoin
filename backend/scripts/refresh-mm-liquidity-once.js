/**
 * Treo lại sổ MM một lần (Nest context) — sau bootstrap bot hoặc khi bot không có lệnh chờ.
 * node scripts/refresh-mm-liquidity-once.js
 */
require("module-alias/register");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../dist/modules/app/app.module");

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"],
  });
  try {
    const mm = app.get(
      require("../dist/modules/market-maker/market-maker.service")
        .MarketMakerService,
    );
    const catalog = app.get(
      require("../dist/modules/market-maker/token-dedicated-bots-catalog.service")
        .TokenDedicatedBotsCatalogService,
    );
    await catalog.whenReady();
    console.log(
      `Pool: ${catalog.usesDedicatedPool() ? "dedicated" : "legacy"}, tokens=${catalog.getTokenGroups().length}`,
    );
    await mm.triggerRefresh();
    console.log("MM refresh xong.");
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
