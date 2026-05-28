/**
 * Động lực taker — impulse một phía, tránh chart barcode (mua/bán đều từng tick).
 */

export type ProbePattern =
  | 'up_then_retrace'
  | 'down_then_retrace'
  | 'both_sides'
  | 'single';

export type FlowSide = 'buy' | 'sell';

export type FlowStep = {
  side: FlowSide;
  qtyScale: number;
};

type TokenRegime = {
  side: FlowSide;
  strength: number;
  ticksLeft: number;
  /** Chuỗi chỉ mua hoặc chỉ bán */
  impulse: boolean;
};

const regimeByToken = new Map<string, TokenRegime>();

function opposite(side: FlowSide): FlowSide {
  return side === 'buy' ? 'sell' : 'buy';
}

function rollNewRegime(): TokenRegime {
  const side: FlowSide = Math.random() > 0.5 ? 'buy' : 'sell';
  const impulse = Math.random() < 0.72;
  return {
    side,
    strength: 0.55 + Math.random() * 0.4,
    ticksLeft: impulse
      ? 10 + Math.floor(Math.random() * 22)
      : 5 + Math.floor(Math.random() * 10),
    impulse,
  };
}

function getRegime(tokenId: string): TokenRegime {
  let state = regimeByToken.get(tokenId);
  if (!state || state.ticksLeft <= 0) {
    state = rollNewRegime();
    regimeByToken.set(tokenId, state);
  }
  state.ticksLeft -= 1;
  return state;
}

/** @deprecated Dùng planAsymmetricFlowSteps (đã gộp skip). */
export function shouldSkipFlowTick(_tokenId?: string): boolean {
  return Math.random() < 0.18;
}

/**
 * Kế hoạch khớp — ưu tiên impulse một phía; hồi rất hiếm và yếu.
 */
export function planAsymmetricFlowSteps(
  tokenId: string,
  bothSidesEnabled: boolean,
): FlowStep[] {
  if (Math.random() < 0.18) {
    return [];
  }

  const reg = getRegime(tokenId);
  const bias = reg.side;

  if (reg.impulse) {
    if (Math.random() < 0.78) {
      return [{ side: bias, qtyScale: 0.82 + Math.random() * 0.55 }];
    }
    return [
      { side: bias, qtyScale: 0.95 + Math.random() * 0.35 },
      { side: bias, qtyScale: 0.5 + Math.random() * 0.45 },
    ];
  }

  const r = Math.random();
  if (r < 0.68) {
    return [{ side: bias, qtyScale: 0.7 + Math.random() * 0.6 }];
  }

  if (r < 0.9) {
    const steps: FlowStep[] = [
      { side: bias, qtyScale: 0.85 + Math.random() * 0.4 },
    ];
    if (Math.random() > 0.72) {
      steps.push({
        side: opposite(bias),
        qtyScale: 0.05 + Math.random() * 0.18,
      });
    }
    return steps;
  }

  if (bothSidesEnabled && r < 0.95) {
    const heavy = bias;
    const light = opposite(bias);
    return [
      { side: heavy, qtyScale: 0.7 + Math.random() * 0.5 },
      { side: light, qtyScale: 0.06 + Math.random() * 0.14 },
    ];
  }

  return [{ side: bias, qtyScale: 0.75 + Math.random() * 0.5 }];
}

export function rollFlowQty(baseQty: number, speed = 1): number {
  const base = Math.max(0.0001, baseQty * speed);
  const isSpike = Math.random() > 0.92;
  const mult = isSpike
    ? 1.5 + Math.random() * 2.5
    : 0.65 + Math.random() * 0.7;
  return Number((base * mult).toFixed(6));
}

export function probeFillCount(maxSweep: number): number {
  const cap = Math.max(1, Math.min(6, maxSweep));
  if (cap <= 1) return 1;
  return 1 + Math.floor(Math.random() * cap);
}

export function pickProbePattern(bothSidesEnabled: boolean): ProbePattern {
  const steps = planAsymmetricFlowSteps(`__legacy-${Math.random()}`, bothSidesEnabled);
  if (steps.length === 0) return 'single';
  if (steps.length === 1) return 'single';
  if (steps.length === 2 && steps[0].side === steps[1].side) {
    return steps[0].side === 'buy' ? 'up_then_retrace' : 'down_then_retrace';
  }
  if (steps.length === 2) return 'both_sides';
  return steps[0].side === 'buy' ? 'up_then_retrace' : 'down_then_retrace';
}

export function clearFlowSideBias(tokenId: string): void {
  regimeByToken.delete(tokenId);
}

/** Chọn 1–N token ngẫu nhiên mỗi pass — tránh quét đồng loạt gây nến đều. */
export function pickFlowTokenNames(
  allNames: string[],
  maxPerPass = 1,
): string[] {
  if (allNames.length === 0) return [];
  const cap = Math.max(1, Math.min(maxPerPass, allNames.length));
  const shuffled = [...allNames].sort(() => Math.random() - 0.5);
  const n =
    cap === 1
      ? 1
      : 1 + Math.floor(Math.random() * cap);
  return shuffled.slice(0, n);
}
