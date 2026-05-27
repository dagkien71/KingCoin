import type { VolatilityFlowProfile } from '@modules/market-maker/volatility-presets.util';

/** @deprecated Dùng VolatilityFlowProfile từ resolveVolatilityProfile — giữ cho path sweep tương thích */
export const FLOW_HIGH_OSCILLATE = 0.003;
export const FLOW_EXTREME_OSCILLATE = 0.006;

export type FlowActivityTier = 'normal' | 'high' | 'extreme';

export function flowSweepMaxFillsFromProfile(flow: VolatilityFlowProfile): number {
  return flow.sweepMaxFills;
}

export function flowPassesPerTickFromProfile(flow: VolatilityFlowProfile): number {
  return flow.passesPerTick;
}

export function flowMatchesBothSidesFromProfile(
  flow: VolatilityFlowProfile,
): boolean {
  return flow.bothSidesPerTick;
}

/** Legacy — suy từ oscillatePct khi không có profile */
export function flowActivityTier(oscillatePct: number): FlowActivityTier {
  if (oscillatePct >= FLOW_EXTREME_OSCILLATE) return 'extreme';
  if (oscillatePct >= FLOW_HIGH_OSCILLATE) return 'high';
  return 'normal';
}

export function flowSweepMaxFills(oscillatePct: number): number {
  const t = flowActivityTier(oscillatePct);
  if (t === 'extreme') return 6;
  if (t === 'high') return 4;
  return 2;
}

export function flowPassesPerTick(oscillatePct: number): number {
  const t = flowActivityTier(oscillatePct);
  if (t === 'extreme') return 3;
  if (t === 'high') return 2;
  return 1;
}

export function flowMatchesBothSidesPerTick(oscillatePct: number): boolean {
  return oscillatePct >= FLOW_HIGH_OSCILLATE;
}
