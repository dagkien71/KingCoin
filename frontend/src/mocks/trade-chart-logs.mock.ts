import type { ITokenCryptoLog } from "@/types/token.type";

/** Log giả lập ~2.5h giao dịch (1 phút/lần) — chỉ dùng preview UI dev. */
export function buildTradeChartMockLogs(count = 150): ITokenCryptoLog[] {
  const now = Date.now();
  const logs: ITokenCryptoLog[] = [];
  let price = 0.92;

  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.47) * 0.018;
    price = Math.max(0.05, Math.min(1.45, price));
    logs.push({
      id: `mock-log-${i}`,
      tokenId: "mock-token",
      price: Number(price.toFixed(6)),
      volume: Math.round((Math.random() * 80 + 12) * 100) / 100,
      timestamp: new Date(now - (count - i) * 60_000),
      hash: `mock-${i}`,
    });
  }

  return logs;
}
