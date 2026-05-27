/** Ngưỡng oscillatePct — đồng bộ preset strong (0.004) / extreme (0.007). */
export const FLOW_HIGH_OSCILLATE = 0.003;
export const FLOW_EXTREME_OSCILLATE = 0.006;

export type FlowActivityTier = 'normal' | 'high' | 'extreme';

export function flowActivityTier(oscillatePct: number): FlowActivityTier {
  if (oscillatePct >= FLOW_EXTREME_OSCILLATE) return 'extreme';
  if (oscillatePct >= FLOW_HIGH_OSCILLATE) return 'high';
  return 'normal';
}

/** Số lệnh taker tối đa mỗi lần sweep theo path / refresh sổ. */
export function flowSweepMaxFills(oscillatePct: number): number {
  const t = flowActivityTier(oscillatePct);
  if (t === 'extreme') return 6;
  if (t === 'high') return 4;
  return 2;
}

/** Vòng lặp khớp trong một tick flow (mạnh = nhiều vòng hơn). */
export function flowPassesPerTick(oscillatePct: number): number {
  const t = flowActivityTier(oscillatePct);
  if (t === 'extreme') return 3;
  if (t === 'high') return 2;
  return 1;
}

/** Mạnh trở lên: mỗi token khớp cả mua ask và bán bid trong cùng tick. */
export function flowMatchesBothSidesPerTick(oscillatePct: number): boolean {
  return oscillatePct >= FLOW_HIGH_OSCILLATE;
}
