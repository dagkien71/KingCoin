import { MmControlService } from '@modules/market-maker/mm-control.service';
import {
  isQuoteToken,
  resolveMmTargetTokenNames,
} from '@modules/market-maker/liquidity-target-tokens.util';
import type { EffectiveLiquiditySettings } from '@modules/market-maker/platform-liquidity-settings.service';
import {
  resolveVolatilityProfile,
  type VolatilityLevelId,
  type VolatilityPricingProfile,
} from '@modules/market-maker/volatility-presets.util';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';

const RAMP_MS = Number(process.env.VOLATILITY_RAMP_MS ?? '45_000') || 45_000;

type RampState = {
  from: EffectiveLiquiditySettings;
  to: EffectiveLiquiditySettings;
  fromPricing: VolatilityPricingProfile;
  toPricing: VolatilityPricingProfile;
  startedAt: number;
  durationMs: number;
};

const RAMP_NUMERIC_KEYS: (keyof EffectiveLiquiditySettings)[] = [
  'mmIntervalMs',
  'flowIntervalMs',
  'mmBotCount',
  'flowBotCount',
  'levels',
  'spreadStep',
  'qty',
  'flowQty',
  'oscillatePct',
  'wanderPct',
  'levelJitterPct',
  'multiMidStep',
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpInt(a: number, b: number, t: number): number {
  return Math.round(lerp(a, b, t));
}

@Injectable()
export class VolatilityTransitionService {
  private readonly logger = new Logger(VolatilityTransitionService.name);
  private ramp: RampState | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mmControl: MmControlService,
    private readonly tokenService: TokenCryptoService,
  ) {}

  isRamping(): boolean {
    return this.ramp != null && this.rampProgress() < 1;
  }

  private rampProgress(): number {
    if (!this.ramp) return 1;
    const elapsed = Date.now() - this.ramp.startedAt;
    return Math.min(1, elapsed / this.ramp.durationMs);
  }

  getRampedPricing(): VolatilityPricingProfile {
    const t = this.rampProgress();
    const target = this.ramp?.toPricing ?? resolveVolatilityProfile('stable').pricing;
    if (!this.ramp || t >= 1) return target;
    const from = this.ramp.fromPricing;
    return {
      bookSkewPct: lerp(from.bookSkewPct, target.bookSkewPct, t),
      maxMidStepPctPerRefresh: lerp(
        from.maxMidStepPctPerRefresh,
        target.maxMidStepPctPerRefresh,
        t,
      ),
      wanderPct: lerp(from.wanderPct, target.wanderPct, t),
      oscillatePct: lerp(from.oscillatePct, target.oscillatePct, t),
      instantFillTolerancePct: lerp(
        from.instantFillTolerancePct,
        target.instantFillTolerancePct,
        t,
      ),
    };
  }

  applyRamped(base: EffectiveLiquiditySettings): EffectiveLiquiditySettings {
    if (!this.ramp || this.rampProgress() >= 1) {
      if (this.ramp && this.rampProgress() >= 1) {
        this.ramp = null;
      }
      return base;
    }
    const t = this.rampProgress();
    const out = { ...base };
    for (const k of RAMP_NUMERIC_KEYS) {
      const from = this.ramp.from[k] as number;
      const to = this.ramp.to[k] as number;
      if (typeof from !== 'number' || typeof to !== 'number') continue;
      if (k === 'mmIntervalMs' || k === 'flowIntervalMs' || k.endsWith('Count')) {
        (out[k] as number) = lerpInt(from, to, t);
      } else {
        (out[k] as number) = lerp(from, to, t);
      }
    }
    out.mmEnabled = this.ramp.to.mmEnabled;
    out.flowEnabled = this.ramp.to.flowEnabled;
    return out;
  }

  async beginVolatilityChange(
    from: EffectiveLiquiditySettings,
    to: EffectiveLiquiditySettings,
    targetLevel: VolatilityLevelId,
  ): Promise<void> {
    const fromLevel = inferLevelFromSettings(from);
    const fromPricing = resolveVolatilityProfile(fromLevel).pricing;
    const toPricing = resolveVolatilityProfile(targetLevel).pricing;

    this.ramp = {
      from,
      to,
      fromPricing,
      toPricing,
      startedAt: Date.now(),
      durationMs: RAMP_MS,
    };

    await this.anchorAllTargetTokens();
    this.logger.log(
      `Volatility ramp ${fromLevel} → ${targetLevel} (${RAMP_MS}ms)`,
    );
  }

  private async anchorAllTargetTokens(): Promise<void> {
    const names = new Set(await resolveMmTargetTokenNames(this.prisma));
    for (const id of this.mmControl.getOverrideTokenIds()) {
      const t = await this.prisma.tokenCrypto.findUnique({
        where: { id },
        select: { name: true, tokenKind: true },
      });
      if (t?.name && !isQuoteToken(t)) names.add(t.name);
    }
    for (const tokenName of names) {
      const token = await this.prisma.tokenCrypto.findFirst({
        where: { name: tokenName },
      });
      if (!token?.id || isQuoteToken(token)) continue;
      const price = token.price && token.price > 0 ? token.price : null;
      if (price == null) continue;
      this.tokenService.cancelPricePersist(token.id);
      await this.mmControl.commitSpotAnchor(token.id, price);
      this.mmControl.setMid(token.id, price);
    }
  }
}

function inferLevelFromSettings(
  s: EffectiveLiquiditySettings,
): VolatilityLevelId {
  const intervals = [
    { id: 'gentle' as const, mm: 900, flow: 1000 },
    { id: 'moderate' as const, mm: 650, flow: 750 },
    { id: 'stable' as const, mm: 500, flow: 500 },
    { id: 'strong' as const, mm: 350, flow: 200 },
    { id: 'extreme' as const, mm: 300, flow: 150 },
  ];
  let best: VolatilityLevelId = 'stable';
  let min = Infinity;
  for (const row of intervals) {
    const d =
      Math.abs(s.mmIntervalMs - row.mm) + Math.abs(s.flowIntervalMs - row.flow);
    if (d < min) {
      min = d;
      best = row.id;
    }
  }
  return best;
}
