import useFetchApi from "@/hooks/useFetchApi";

export type TradingFeeRates = {
  spot: { makerRate: number; takerRate: number };
  convert: { rate: number };
  futures: {
    openRate: number;
    closeRate: number;
    fundingRate: number;
    liquidationFeeRate: number | null;
  };
};

export function feeFromNotional(notionalKc: number, rate: number): number {
  if (!Number.isFinite(notionalKc) || notionalKc <= 0 || rate <= 0) return 0;
  return notionalKc * rate;
}

export function formatFeePct(rate: number): string {
  return `${(rate * 100).toFixed(3).replace(/\.?0+$/, "")}%`;
}

export function useTradingFees(liquidationFeeRate?: number | null) {
  const q =
    liquidationFeeRate != null
      ? `?liquidationFeeRate=${liquidationFeeRate}`
      : "";
  return useFetchApi<TradingFeeRates>(`/fees/rates${q}`);
}
