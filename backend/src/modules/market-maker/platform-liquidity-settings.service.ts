import {
  flowBotCountFromEnv,
  mmBotCountFromEnv,
} from '@modules/market-maker/liquidity-bots.util';
import {
  flowQtyFromEnv,
  mmLevelsFromEnv,
  mmQtyFromEnv,
} from '@modules/market-maker/mm-params.util';
import {
  envMmEnabledFromProcess,
  readEnvFlag,
} from '@modules/market-maker/mm-env.util';
import { MmControlService } from '@modules/market-maker/mm-control.service';
import { MmBotRegistryService } from '@modules/market-maker/mm-bot-registry.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PlatformLiquiditySettings } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { PatchPlatformLiquiditySettingsDto } from './dto/patch-platform-liquidity-settings.dto';
import { NORMAL_STEADY_PRESET } from './liquidity-presets.util';
import {
  inferVolatilityLevel,
  isVolatilityLevelId,
  VOLATILITY_LEVELS,
  volatilityPresetFor,
  type VolatilityLevelId,
} from './volatility-presets.util';

export const PLATFORM_LIQUIDITY_SETTINGS_ID = 'platform-liquidity-default';

export type LiquiditySettingsSource = 'env' | 'db';

export type EffectiveLiquiditySettings = {
  mmEnabled: boolean;
  flowEnabled: boolean;
  mmIntervalMs: number;
  flowIntervalMs: number;
  mmBotCount: number;
  flowBotCount: number;
  levels: number;
  spreadStep: number;
  qty: number;
  flowQty: number;
  oscillatePct: number;
  wanderPct: number;
  levelJitterPct: number;
  multiMidStep: number;
};

export type LiquiditySettingsResponse = {
  effective: EffectiveLiquiditySettings;
  env: EffectiveLiquiditySettings;
  db: Partial<PlatformLiquiditySettings> | null;
  sources: Record<keyof EffectiveLiquiditySettings, LiquiditySettingsSource>;
  volatilityLevels: typeof VOLATILITY_LEVELS;
  currentVolatilityLevel: VolatilityLevelId;
};

function readPositiveNumber(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function envFlowEnabledDefault(mmEnabled: boolean): boolean {
  if (readEnvFlag('MARKET_FLOW_ENABLED') === false) return false;
  return mmEnabled;
}

/** Khớp `PatchPlatformLiquiditySettingsDto` — env/DB cũ có thể vượt giới hạn. */
function clampLiquiditySettings(
  s: EffectiveLiquiditySettings,
): EffectiveLiquiditySettings {
  return {
    ...s,
    mmIntervalMs: Math.min(60_000, Math.max(500, s.mmIntervalMs)),
    flowIntervalMs: Math.min(60_000, Math.max(300, s.flowIntervalMs)),
    mmBotCount: Math.min(32, Math.max(0, s.mmBotCount)),
    flowBotCount: Math.min(16, Math.max(0, s.flowBotCount)),
    levels: Math.min(12, Math.max(1, s.levels)),
    spreadStep: Math.min(0.2, Math.max(0.0001, s.spreadStep)),
    qty: Math.min(1_000_000, Math.max(1, s.qty)),
    flowQty: Math.min(100_000, Math.max(1, s.flowQty)),
    oscillatePct: Math.min(0.05, Math.max(0, s.oscillatePct)),
    wanderPct: Math.min(0.02, Math.max(0, s.wanderPct)),
    levelJitterPct: Math.min(0.02, Math.max(0, s.levelJitterPct)),
    multiMidStep: Math.min(2, Math.max(0, s.multiMidStep)),
  };
}

@Injectable()
export class PlatformLiquiditySettingsService implements OnModuleInit {
  private readonly logger = new Logger(PlatformLiquiditySettingsService.name);
  private dbRow: PlatformLiquiditySettings | null = null;
  private readonly intervalListeners = new Set<() => void>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mmControl: MmControlService,
    private readonly botRegistry: MmBotRegistryService,
  ) {}

  onIntervalsChanged(listener: () => void): () => void {
    this.intervalListeners.add(listener);
    return () => this.intervalListeners.delete(listener);
  }

  private notifyIntervalListeners(): void {
    for (const fn of this.intervalListeners) {
      try {
        fn();
      } catch (e) {
        this.logger.warn(
          `interval listener: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  getEnvDefaults(): EffectiveLiquiditySettings {
    const mmEnabled = envMmEnabledFromProcess();
    const raw: EffectiveLiquiditySettings = {
      mmEnabled,
      flowEnabled: envFlowEnabledDefault(mmEnabled),
      mmIntervalMs: Math.max(
        500,
        readPositiveNumber(process.env.MARKET_MAKER_INTERVAL_MS, 1000),
      ),
      flowIntervalMs: Math.max(
        300,
        readPositiveNumber(process.env.MARKET_FLOW_INTERVAL_MS, 1500),
      ),
      mmBotCount: mmBotCountFromEnv(),
      flowBotCount: flowBotCountFromEnv(),
      levels: mmLevelsFromEnv(),
      spreadStep: readPositiveNumber(
        process.env.MARKET_MAKER_SPREAD_STEP,
        0.0025,
      ),
      qty: mmQtyFromEnv(),
      flowQty: flowQtyFromEnv(),
      oscillatePct: Math.min(
        0.05,
        readPositiveNumber(process.env.MARKET_MAKER_OSCILLATE_PCT, 0.006),
      ),
      wanderPct: Math.min(
        0.02,
        readPositiveNumber(process.env.MARKET_MAKER_WANDER_PCT, 0.004),
      ),
      levelJitterPct: Math.min(
        0.02,
        readPositiveNumber(process.env.MARKET_MAKER_LEVEL_JITTER_PCT, 0.0015),
      ),
      multiMidStep: readPositiveNumber(
        process.env.MARKET_MAKER_MULTI_MID_STEP,
        0.4,
      ),
    };
    return clampLiquiditySettings(raw);
  }

  private pick<T>(
    key: keyof EffectiveLiquiditySettings,
    dbVal: T | null | undefined,
    envVal: T,
  ): { value: T; source: LiquiditySettingsSource } {
    if (dbVal !== null && dbVal !== undefined) {
      return { value: dbVal, source: 'db' };
    }
    return { value: envVal, source: 'env' };
  }

  getEffective(): EffectiveLiquiditySettings {
    const env = this.getEnvDefaults();
    const db = this.dbRow;
    const out = {} as EffectiveLiquiditySettings;
    const keys = Object.keys(env) as (keyof EffectiveLiquiditySettings)[];
    for (const k of keys) {
      const dbVal = db?.[k as keyof PlatformLiquiditySettings] as
        | number
        | boolean
        | null
        | undefined;
      out[k] = this.pick(k, dbVal, env[k]).value;
    }
    if (!out.mmEnabled) {
      out.flowEnabled = false;
    } else if (db?.flowEnabled === undefined || db?.flowEnabled === null) {
      out.flowEnabled = env.flowEnabled;
    }
    const clamped = clampLiquiditySettings(out);
    if (clamped.spreadStep !== out.spreadStep) {
      this.logger.warn(
        `spreadStep ${out.spreadStep} vượt giới hạn — runtime dùng ${clamped.spreadStep}`,
      );
    }
    return clamped;
  }

  getAdminView(): LiquiditySettingsResponse {
    const env = this.getEnvDefaults();
    const effective = this.getEffective();
    const sources = {} as LiquiditySettingsResponse['sources'];
    const keys = Object.keys(env) as (keyof EffectiveLiquiditySettings)[];
    for (const k of keys) {
      const dbVal = this.dbRow?.[k as keyof PlatformLiquiditySettings] as
        | number
        | boolean
        | null
        | undefined;
      sources[k] = this.pick(k, dbVal, env[k]).source;
    }
    return {
      effective,
      env,
      db: this.dbRow,
      sources,
      volatilityLevels: VOLATILITY_LEVELS,
      currentVolatilityLevel: inferVolatilityLevel(effective.oscillatePct),
    };
  }

  async onModuleInit(): Promise<void> {
    await this.loadFromDb();
    if (process.env.MM_FORCE_NORMAL_STEADY_PRESET === 'true') {
      this.logger.log(
        'MM_FORCE_NORMAL_STEADY_PRESET — áp preset bình thường ±0.1%',
      );
      await this.patch(NORMAL_STEADY_PRESET);
    } else {
      await this.applyToRuntime({ notifyIntervals: false });
    }
    this.logger.log('Đã nạp cài đặt thanh khoản từ DB (nếu có)');
  }

  async loadFromDb(): Promise<void> {
    this.dbRow =
      (await this.prisma.platformLiquiditySettings.findUnique({
        where: { id: PLATFORM_LIQUIDITY_SETTINGS_ID },
      })) ?? null;
  }

  async patch(
    dto: PatchPlatformLiquiditySettingsDto,
  ): Promise<LiquiditySettingsResponse> {
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) {
        data[k] = v;
      }
    }
    if (data.mmEnabled === false) {
      data.flowEnabled = false;
    }
    this.dbRow = await this.prisma.platformLiquiditySettings.upsert({
      where: { id: PLATFORM_LIQUIDITY_SETTINGS_ID },
      create: {
        id: PLATFORM_LIQUIDITY_SETTINGS_ID,
        ...data,
      },
      update: data,
    });
    await this.applyToRuntime({ notifyIntervals: true });
    return this.getAdminView();
  }

  async resetToEnv(): Promise<LiquiditySettingsResponse> {
    await this.prisma.platformLiquiditySettings
      .delete({ where: { id: PLATFORM_LIQUIDITY_SETTINGS_ID } })
      .catch(() => undefined);
    this.dbRow = null;
    await this.applyToRuntime({ notifyIntervals: true });
    return this.getAdminView();
  }

  async applyNormalSteadyPreset(): Promise<LiquiditySettingsResponse> {
    return this.patch(NORMAL_STEADY_PRESET);
  }

  async applyVolatilityPreset(level: string): Promise<LiquiditySettingsResponse> {
    if (!isVolatilityLevelId(level)) {
      throw new BadRequestException(
        `Mức biến động không hợp lệ: ${level}. Dùng: gentle | moderate | stable | strong | extreme`,
      );
    }
    const preset = volatilityPresetFor(level);
    if (!preset) {
      throw new BadRequestException(`Không có preset cho mức: ${level}`);
    }
    return this.patch(preset);
  }

  async applyToRuntime(opts?: { notifyIntervals?: boolean }): Promise<void> {
    const e = this.getEffective();
    this.mmControl.patchGlobal({
      mmEnabled: e.mmEnabled,
      flowEnabled: e.flowEnabled,
      levels: e.levels,
      spreadStep: e.spreadStep,
      qty: e.qty,
      oscillatePct: e.oscillatePct,
      wanderPct: e.wanderPct,
      levelJitterPct: e.levelJitterPct,
    });
    this.botRegistry.applyTargetBotCounts(e.mmBotCount, e.flowBotCount);
    if (opts?.notifyIntervals !== false) {
      this.notifyIntervalListeners();
    }
  }
}
