import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Hàm tạo hash cho log
function generateLogHash(
  tokenId: string,
  price: number,
  volume: number,
  timestamp: Date,
): string {
  const data = `${tokenId}-${price}-${volume}-${timestamp.toISOString()}`;
  return createHash('sha256').update(data).digest('hex');
}

// Hàm sinh log từ 2018
function generateLogs(
  tokenId: string,
  startYear: number,
  endYear: number,
): Array<any> {
  const logs: Array<{
    tokenId: string;
    price: number;
    volume: number;
    timestamp: Date;
    hash: string;
  }> = [];
  const currentDate = new Date();

  // Tạo log cho từng năm từ startYear đến endYear
  for (let year = startYear; year <= endYear; year++) {
    // Số lượng logs mỗi năm
    const numberOfLogs = 12; // Mỗi tháng tạo 1 log

    for (let i = 0; i < numberOfLogs; i++) {
      const month = i;

      // Rest of the code remains the same
      const day = Math.floor(Math.random() * 28) + 1; // Ngẫu nhiên từ 1-28 ngày trong tháng
      const logDate = new Date(year, month, day);

      // Nếu logDate vượt quá ngày hiện tại, dừng
      if (logDate > currentDate) {
        break;
      }

      // Sinh ngẫu nhiên giá và volume
      const price = parseFloat((Math.random() * 200 + 50).toFixed(2)); // Giá dao động từ 50 đến 250
      const volume = Math.floor(Math.random() * 10000) + 1000; // Volume dao động từ 1000 đến 11000

      const hash = generateLogHash(tokenId, price, volume, logDate);

      logs.push({
        tokenId: tokenId,
        price,
        volume,
        timestamp: logDate,
        hash,
      });
    }
  }

  return logs;
}

async function main() {
  const tokenId = 'c01c8a65-0a0d-497a-aad9-386e8d5280f6';

  // Tạo log từ năm 2018 đến nay
  const logs = generateLogs(tokenId, 2018, new Date().getFullYear());

  // Ghi các logs vào cơ sở dữ liệu
  for (const log of logs) {
    await prisma.tokenCryptoLog.create({
      data: log,
    });
  }

  console.log(`Generated and inserted ${logs.length} logs into the database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
