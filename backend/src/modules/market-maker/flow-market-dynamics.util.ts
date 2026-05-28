/**
 * Động lực thị trường từ khớp lệnh thật — râu nến, volume spike, probe hai phía.
 * Giá vẫn chỉ đổi qua fill; không sinh spot ảo.
 */

export type ProbePattern =
  | 'up_then_retrace'
  | 'down_then_retrace'
  | 'both_sides'
  | 'single';

/** Khối lượng cơ bản + nhiễu + thỉnh thoảng spike (5%). */
export function rollFlowQty(baseQty: number, speed = 1): number {
  const base = Math.max(0.0001, baseQty * speed);
  const isSpike = Math.random() > 0.95;
  const mult = isSpike
    ? 5 + Math.random() * 10
    : 0.55 + Math.random() * 0.9;
  return Number((base * mult).toFixed(6));
}

/** Số fill probe mỗi phía (ăn nhiều bậc sổ → H/L trong bucket). */
export function probeFillCount(maxSweep: number): number {
  const cap = Math.max(1, Math.min(6, maxSweep));
  if (cap <= 1) return 1;
  return 1 + Math.floor(Math.random() * cap);
}

/** Chọn pattern — ưu tiên probe để tạo râu nến. */
export function pickProbePattern(bothSidesEnabled: boolean): ProbePattern {
  const r = Math.random();
  if (bothSidesEnabled) {
    if (r < 0.38) return 'up_then_retrace';
    if (r < 0.68) return 'down_then_retrace';
    if (r < 0.82) return 'both_sides';
    return 'single';
  }
  if (r < 0.42) return 'up_then_retrace';
  if (r < 0.78) return 'down_then_retrace';
  return 'single';
}
