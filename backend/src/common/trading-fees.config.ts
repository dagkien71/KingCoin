/** Phí giao dịch — đọc từ env, mặc định theo mô phỏng sàn nhỏ. */
function parseRate(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

export const TRADING_FEES = {
  /** Spot — lệnh khớp ngay (taker) */
  spotTakerRate: parseRate('SPOT_TAKER_FEE_RATE', 0.001),
  /** Spot — lệnh treo sổ (maker) */
  spotMakerRate: parseRate('SPOT_MAKER_FEE_RATE', 0.0005),
  /** Chuyển đổi token ↔ token */
  convertRate: parseRate('CONVERT_FEE_RATE', 0.003),
  /** Futures — mở vị thế (% notional) */
  futuresOpenRate: parseRate('FUTURES_OPEN_FEE_RATE', 0.0004),
  /** Futures — đóng vị thế (% notional) */
  futuresCloseRate: parseRate('FUTURES_CLOSE_FEE_RATE', 0.0004),
  /** Funding — long trả / short nhận mỗi chu kỳ (% notional) */
  futuresFundingRate: parseRate('FUTURES_FUNDING_RATE', 0.0001),
} as const;

export function feeFromNotional(notionalKc: number, rate: number): number {
  if (!Number.isFinite(notionalKc) || notionalKc <= 0 || rate <= 0) return 0;
  return Math.max(0, notionalKc * rate);
}

export function formatFeeRatePct(rate: number): string {
  return `${(rate * 100).toFixed(3).replace(/\.?0+$/, '')}%`;
}
