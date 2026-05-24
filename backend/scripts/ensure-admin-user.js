/**
 * Tạo hoặc nâng quyền tài khoản admin (dev).
 * Chạy: node scripts/ensure-admin-user.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@kingcoin.local";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin12345";
const USERNAME = process.env.ADMIN_USERNAME ?? "admin";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "admin",
        username: USERNAME,
        password: hash,
        status: "active",
      },
    });
    console.log(`Đã cập nhật admin: ${EMAIL} (role=admin, mật khẩu đã reset)`);
    return;
  }

  await prisma.user.create({
    data: {
      email: EMAIL,
      password: hash,
      username: USERNAME,
      role: "admin",
      walletAddress: `0xADM${Math.random().toString(16).slice(2, 38)}`,
      socialLinks: [],
      balance: { create: { stableCoin: 0 } },
    },
  });

  console.log(`Đã tạo admin: ${EMAIL}`);
  console.log(`Mật khẩu: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
