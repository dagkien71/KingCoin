/**
 * Tham chiếu preset market-control `model-volatile-trend-*` (GBM σ≈0.048, tick ~1s).
 * Slider Mạnh/Cực mạnh dùng MM+flow 24/7 — không chạy PriceModelRun 25 phút.
 */

/** Chu kỳ sóng mid (ms) — ngắn hơn = giá “nhảy” nhanh hơn. */
export function mmWavePeriodMs(oscillatePct: number): number {
  if (oscillatePct >= 0.006) return 30_000;
  if (oscillatePct >= 0.003) return 45_000;
  return 120_000;
}

/** Hệ số wander trên nhánh neo giá — mạnh ≈ GBM lắc từng bước. */
export function mmWanderScale(oscillatePct: number): number {
  if (oscillatePct >= 0.006) return 1;
  if (oscillatePct >= 0.003) return 0.75;
  return 0.25;
}
