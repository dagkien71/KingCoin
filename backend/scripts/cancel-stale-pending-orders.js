/**
 * Xóa lệnh pending tạo TRƯỚC khi có escrow (không có ledger order_reserve).
 * Tránh hủy nhầm hoàn tiền — chỉ prisma.order.deleteMany.
 *
 * Chạy: node scripts/cancel-stale-pending-orders.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.order.findMany({
    where: { status: "pending" },
    select: { id: true },
  });
  if (!pending.length) {
    console.log("Không có lệnh pending.");
    return;
  }

  const reserves = await prisma.ledgerEntry.findMany({
    where: { refType: "order_reserve" },
    select: { refId: true },
  });
  const reserved = new Set(reserves.map((r) => r.refId).filter(Boolean));

  const staleIds = pending
    .map((o) => o.id)
    .filter((id) => !reserved.has(id));

  if (!staleIds.length) {
    console.log("Mọi lệnh pending đều có escrow — không xóa.");
    return;
  }

  const r = await prisma.order.deleteMany({
    where: { id: { in: staleIds } },
  });
  console.log(`Đã xóa ${r.count} lệnh pending cũ (không escrow).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
