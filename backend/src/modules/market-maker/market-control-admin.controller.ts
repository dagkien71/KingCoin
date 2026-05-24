import { AccessGuard } from '@modules/casl';
import { MarketMakerService } from '@modules/market-maker/market-maker.service';
import {
  MmControlService,
  MmGlobalOverride,
  MmTokenOverride,
  PRICE_MODEL_CATALOG,
} from '@modules/market-maker/mm-control.service';
import { PriceModelId } from '@modules/market-maker/price-path-models';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@prisma/client';
import { TokenCrypto } from '@prisma/client';
import {
  BulkModelRunDto,
  BulkPatchBookDto,
  BulkRelativeScheduleDto,
  BulkTargetDto,
} from './dto/market-control-bulk.dto';
import {
  CreatePriceScheduleDto,
  NudgePriceDto,
  PatchMmGlobalDto,
  PatchMmTokenDto,
  SetSpotPriceDto,
  StartPriceModelRunDto,
} from './dto/market-control.dto';
import { OrderbookPathService } from './orderbook-path.service';
import { resolveBulkTargetTokens } from './market-control-bulk.util';
import { modelParamsFromPreset } from './model-preset-params.util';
import { resolvePathTimeWindow } from './resolve-path-window.util';

@ApiTags('MarketControl')
@ApiBearerAuth()
@UseGuards(AccessGuard(Roles.admin))
@Controller('/admin/market-control')
export class MarketControlAdminController {
  constructor(
    private readonly mmControl: MmControlService,
    private readonly marketMaker: MarketMakerService,
    private readonly tokenService: TokenCryptoService,
    private readonly orderbookPath: OrderbookPathService,
  ) {}

  @Get()
  async getDashboard() {
    const tokensResult = await this.tokenService.findAll({});
    const list = tokensResult.data ?? [];
    const snap = this.mmControl.getSnapshot();

    const tokens = list.map((t) => {
      const ov = snap.tokens[t.id] ?? {};
      const params = this.mmControl.resolveParams(t.id);
      return {
        id: t.id,
        name: t.name,
        symbol: t.symbol,
        logo: t.logo ?? null,
        price: t.price,
        mid: this.mmControl.getMid(t.id) ?? null,
        spotAnchor: this.mmControl.getSpotAnchor(t.id) ?? null,
        paused: this.mmControl.isTokenPaused(t.id),
        override: ov,
        params,
        schedule: this.mmControl.getScheduleView(t.id),
        modelRun: this.mmControl.getModelRunView(t.id),
      };
    });

    return {
      ...snap,
      env: {
        mmEmail: process.env.MARKET_MAKER_EMAIL ?? 'marketmaker@kingcoin.local',
        flowEmail: process.env.MARKET_FLOW_EMAIL ?? 'flow@kingcoin.local',
        tokenNames:
          process.env.MARKET_MAKER_TOKEN_NAMES ??
          process.env.MARKET_MAKER_TOKEN_NAME ??
          'KingCoin,Demo KingCoin',
        spreadStepEnv: process.env.MARKET_MAKER_SPREAD_STEP ?? '0.0025',
        levelsEnv: process.env.MARKET_MAKER_LEVELS ?? '6',
      },
      tokens,
    };
  }

  @Patch('global')
  patchGlobal(@Body() dto: PatchMmGlobalDto): MmGlobalOverride {
    return this.mmControl.patchGlobal(dto);
  }

  @Patch('tokens/:tokenId')
  patchToken(
    @Param('tokenId') tokenId: string,
    @Body() dto: PatchMmTokenDto,
  ): Promise<MmTokenOverride> {
    return this.ensureToken(tokenId).then(() =>
      this.mmControl.patchToken(tokenId, dto),
    );
  }

  @Post('tokens/:tokenId/reset')
  async resetToken(@Param('tokenId') tokenId: string) {
    await this.ensureToken(tokenId);
    this.mmControl.resetToken(tokenId);
    await this.marketMaker.triggerRefresh();
    return { ok: true };
  }

  @Post('tokens/:tokenId/set-price')
  async setPrice(
    @Param('tokenId') tokenId: string,
    @Body() dto: SetSpotPriceDto,
  ) {
    const token = await this.ensureToken(tokenId);
    const result = await this.orderbookPath.setPriceWithBookPath(
      token,
      dto.price,
      dto.logVolume ?? 0,
    );
    if (result.pathMode === 'instant') {
      await this.marketMaker.triggerRefresh();
    } else {
      await this.marketMaker.triggerRefreshForToken(tokenId);
    }
    return {
      price: result.price,
      previous: result.previous,
      pathMode: result.pathMode,
      pathSteps: result.pathSteps,
      mid: this.mmControl.getMid(tokenId),
      spotAnchor: this.mmControl.getSpotAnchor(tokenId),
    };
  }

  @Post('tokens/:tokenId/nudge')
  async nudge(
    @Param('tokenId') tokenId: string,
    @Body() dto: NudgePriceDto,
  ) {
    const token = await this.ensureToken(tokenId);
    const pct = dto.pct ?? 0.01;
    const result = await this.orderbookPath.nudgeWithBookPath(
      token,
      dto.direction,
      pct,
      dto.logVolume ?? 0,
    );
    if (result.pathMode === 'instant') {
      await this.marketMaker.triggerRefresh();
    } else {
      await this.marketMaker.triggerRefreshForToken(tokenId);
    }
    return {
      price: result.price,
      previous: result.previous,
      pathMode: result.pathMode,
      pathSteps: result.pathSteps,
      mid: this.mmControl.getMid(tokenId),
      spotAnchor: this.mmControl.getSpotAnchor(tokenId),
    };
  }

  @Post('tokens/:tokenId/sync-mid')
  async syncMid(@Param('tokenId') tokenId: string) {
    const token = await this.ensureToken(tokenId);
    const p = token.price && token.price > 0 ? token.price : 1;
    this.mmControl.setMid(tokenId, p);
    this.mmControl.patchToken(tokenId, { forceMid: p });
    await this.marketMaker.triggerRefresh();
    return { mid: p, price: p };
  }

  @Post('refresh')
  async refreshBook() {
    await this.marketMaker.triggerRefresh();
    return { ok: true };
  }

  @Post('tokens/:tokenId/refresh')
  async refreshTokenBook(@Param('tokenId') tokenId: string) {
    await this.ensureToken(tokenId);
    await this.marketMaker.triggerRefreshForToken(tokenId);
    return { ok: true, tokenId };
  }

  /** Đẩy mid lên/xuống không đổi giá DB — chỉ sổ lệnh & ticker WS */
  @Post('tokens/:tokenId/nudge-mid')
  async nudgeMid(
    @Param('tokenId') tokenId: string,
    @Body() dto: NudgePriceDto,
  ) {
    const token = await this.ensureToken(tokenId);
    const pct = dto.pct ?? 0.005;
    const cur =
      this.mmControl.getMid(tokenId) ??
      this.mmControl.getSpotAnchor(tokenId) ??
      (token.price && token.price > 0 ? token.price : 1);
    const factor = dto.direction === 'up' ? 1 + pct : 1 - pct;
    const next = Number((cur * factor).toFixed(8));
    if (next <= 0) {
      throw new BadRequestException('Mid sau điều chỉnh không hợp lệ');
    }
    await this.mmControl.commitSpotAnchor(tokenId, next);
    await this.marketMaker.triggerRefresh();
    return { mid: next, previous: cur, price: next };
  }

  @Post('tokens/:tokenId/schedule')
  async createSchedule(
    @Param('tokenId') tokenId: string,
    @Body() dto: CreatePriceScheduleDto,
  ) {
    const token = await this.ensureToken(tokenId);
    this.assertVolatileForPricePath(token);
    const { startAt, endAt } = resolvePathTimeWindow({
      startAt: dto.startAt,
      endAt: dto.endAt,
      minutes: dto.minutes,
    });
    const spot = token.price && token.price > 0 ? token.price : 1;
    const schedule = this.mmControl.createPriceSchedule(
      tokenId,
      {
        startAt,
        endAt,
        priceMin: dto.priceMin,
        priceMax: dto.priceMax,
        waveCycles: dto.waveCycles,
        restoreOnEnd: dto.restoreOnEnd,
      },
      spot,
    );
    await this.marketMaker.triggerRefresh();
    return {
      schedule: this.mmControl.getScheduleView(tokenId),
    };
  }

  @Post('tokens/:tokenId/model-run')
  async startModelRun(
    @Param('tokenId') tokenId: string,
    @Body() dto: StartPriceModelRunDto,
  ) {
    const token = await this.ensureToken(tokenId);
    this.assertVolatileForPricePath(token);
    const { startAt, endAt } = resolvePathTimeWindow({
      startAt: dto.startAt,
      endAt: dto.endAt,
      durationMin: dto.durationMin,
    });
    const modelId = dto.modelId as PriceModelId;
    const spot = token.price && token.price > 0 ? token.price : 1;
    const run = this.mmControl.createPriceModelRun(
      tokenId,
      {
        modelId,
        startAt,
        endAt,
        params: dto.params,
        restoreOnEnd: dto.restoreOnEnd,
      },
      spot,
    );
    await this.marketMaker.triggerRefresh();
    return {
      modelRun: this.mmControl.getModelRunView(tokenId),
      id: run.id,
    };
  }

  @Post('tokens/:tokenId/model-run/cancel')
  async cancelModelRun(@Param('tokenId') tokenId: string) {
    await this.ensureToken(tokenId);
    const ok = this.mmControl.cancelPriceModelRun(tokenId);
    if (!ok) {
      throw new BadRequestException(
        'Không có mô hình đang chạy cho token này',
      );
    }
    await this.marketMaker.triggerRefresh();
    return { ok: true };
  }

  @Post('tokens/:tokenId/schedule/cancel')
  async cancelSchedule(@Param('tokenId') tokenId: string) {
    await this.ensureToken(tokenId);
    const ok = this.mmControl.cancelPriceSchedule(tokenId);
    if (!ok) {
      throw new BadRequestException('Không có lịch đang chạy cho token này');
    }
    await this.marketMaker.triggerRefresh();
    return { ok: true };
  }

  @Post('tokens/:tokenId/clear-mid-override')
  async clearMidOverride(@Param('tokenId') tokenId: string) {
    await this.ensureToken(tokenId);
    this.mmControl.patchToken(tokenId, { forceMid: null, targetPrice: null });
    this.mmControl.clearMid(tokenId);
    await this.marketMaker.triggerRefresh();
    return { ok: true };
  }

  /** PP1 lịch sin — cùng tỷ lệ % quanh giá spot từng mã */
  @Post('bulk/schedule-relative')
  async bulkScheduleRelative(@Body() dto: BulkRelativeScheduleDto) {
    const targets = await resolveBulkTargetTokens(
      this.tokenService,
      dto,
    );
    const applied: { id: string; symbol: string | null }[] = [];
    for (const token of targets) {
      const { startAt, endAt } = resolvePathTimeWindow({
        startAt: dto.startAt,
        endAt: dto.endAt,
        minutes: dto.minutes,
      });
      this.assertVolatileForPricePath(token);
      const spot = token.price && token.price > 0 ? token.price : 1;
      this.mmControl.createPriceSchedule(
        token.id,
        {
          startAt,
          endAt,
          priceMin: Number((spot * dto.minRatio).toFixed(8)),
          priceMax: Number((spot * dto.maxRatio).toFixed(8)),
          waveCycles: dto.waveCycles ?? 4,
          restoreOnEnd: dto.restoreOnEnd ?? false,
        },
        spot,
      );
      applied.push({ id: token.id, symbol: token.symbol });
    }
    await this.marketMaker.triggerRefresh();
    return { ok: true, count: applied.length, tokens: applied };
  }

  /** PP2 mô hình — params tính theo spot từng token */
  @Post('bulk/model-run')
  async bulkModelRun(@Body() dto: BulkModelRunDto) {
    const targets = await resolveBulkTargetTokens(
      this.tokenService,
      dto,
    );
    const modelId = dto.modelId as PriceModelId;
    const applied: { id: string; symbol: string | null; modelId: string }[] = [];
    for (const token of targets) {
      const { startAt, endAt } = resolvePathTimeWindow({
        startAt: dto.startAt,
        endAt: dto.endAt,
        durationMin: dto.durationMin,
      });
      this.assertVolatileForPricePath(token);
      const spot = token.price && token.price > 0 ? token.price : 1;
      const params = modelParamsFromPreset(
        dto.presetId,
        modelId,
        spot,
        dto.params,
      );
      this.mmControl.createPriceModelRun(
        token.id,
        {
          modelId,
          startAt,
          endAt,
          params,
          restoreOnEnd: dto.restoreOnEnd ?? false,
        },
        spot,
      );
      applied.push({
        id: token.id,
        symbol: token.symbol,
        modelId,
      });
    }
    await this.marketMaker.triggerRefresh();
    return { ok: true, count: applied.length, tokens: applied };
  }

  /** Spread / levels — cùng setup sổ lệnh cho nhóm */
  @Patch('bulk/tokens')
  async bulkPatchTokens(@Body() dto: BulkPatchBookDto) {
    const targets = await resolveBulkTargetTokens(
      this.tokenService,
      dto,
    );
    const patch: { spreadStep?: number | null; levels?: number | null } = {};
    if (dto.spreadStep != null) patch.spreadStep = dto.spreadStep;
    if (dto.levels != null) patch.levels = dto.levels;
    if (!Object.keys(patch).length) {
      throw new BadRequestException('Cần spreadStep hoặc levels.');
    }
    for (const token of targets) {
      this.mmControl.patchToken(token.id, patch);
      await this.marketMaker.triggerRefreshForToken(token.id);
    }
    return {
      ok: true,
      count: targets.length,
      tokens: targets.map((t) => ({ id: t.id, symbol: t.symbol })),
    };
  }

  /** Hủy lịch + mô hình trên nhóm */
  @Post('bulk/cancel-paths')
  async bulkCancelPaths(@Body() dto: BulkTargetDto) {
    const targets = await resolveBulkTargetTokens(
      this.tokenService,
      dto,
    );
    let schedules = 0;
    let models = 0;
    for (const token of targets) {
      if (this.mmControl.cancelPriceSchedule(token.id)) schedules += 1;
      if (this.mmControl.cancelPriceModelRun(token.id)) models += 1;
    }
    await this.marketMaker.triggerRefresh();
    return {
      ok: true,
      count: targets.length,
      cancelledSchedules: schedules,
      cancelledModels: models,
    };
  }

  private async ensureToken(tokenId: string): Promise<TokenCrypto> {
    const token = await this.tokenService.findById(tokenId);
    if (!token) {
      throw new NotFoundException('Token không tồn tại');
    }
    return token;
  }

  /** KC là stablecoin quote — không chạy lịch / mô hình path giá. */
  private assertVolatileForPricePath(token: TokenCrypto): void {
    if (token.tokenKind === 'stablecoin' || token.symbol === 'KC') {
      throw new BadRequestException(
        'KingCoin (KC) là stablecoin quote — không dùng lịch hoặc mô hình điều khiển giá. Chỉ chỉnh peg thủ công (đặt giá ≈ 1.0) nếu cần. Xem docs/STABLECOIN_KC_SPEC.md',
      );
    }
  }
}
