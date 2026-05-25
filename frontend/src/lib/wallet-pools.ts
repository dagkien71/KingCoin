import type { IBalanceSnapshot, WalletPoolId } from "@/types/trade.type";

/** KC khả dụng theo ví — spot dùng cho giao dịch spot, futures cho hợp đồng. */
export function poolAvailableKc(
  balances: IBalanceSnapshot | null | undefined,
  pool: WalletPoolId
): number {
  if (!balances) return 0;
  if (pool === "spot") return balances.spotKc ?? balances.quoteKc ?? 0;
  if (pool === "futures") return balances.futuresKc ?? 0;
  return balances.fundingKc ?? 0;
}
