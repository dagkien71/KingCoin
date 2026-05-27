const { randomInt } = require("crypto");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateWalletCode() {
  let suffix = "";
  for (let i = 0; i < 8; i++) {
    suffix += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `KC-${suffix}`;
}

/** Mã ví unique — retry khi trùng index Mongo. */
async function uniqueWalletCode(prisma, maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateWalletCode();
    const taken = await prisma.user.findUnique({
      where: { walletCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("Không tạo được walletCode unique");
}

module.exports = { generateWalletCode, uniqueWalletCode };
