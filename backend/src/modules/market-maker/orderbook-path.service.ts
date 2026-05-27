import { TokenCryptoLogService } from '@modules/token-crypto/token-log.service';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { TokenCrypto } from '@prisma/client';
import { MarketFlowService } from './market-flow.service';
import { MarketMakerService } from './market-maker.service';
import { MmControlService } from './mm-control.service';
import {
  computePricePathSteps,
  pathStepDelayMs,
  pathWalkConfigFromEnv,
  pricePathDirection,
  shouldWalkPricePath,
} from './orderbook-path.util';

export type SpotPathResult = {
  price: number;
  previous: number;
  pathMode: 'instant' | 'walk';
  pathSteps?: number;
};

@Injectable()
export class OrderbookPathService implements OnModuleInit {
  private readonly logger = new Logger(OrderbookPathService.name);
  private readonly walksInFlight = new Set<string>();

  constructor(
    private readonly mmControl: MmControlService,
    private readonly marketMaker: MarketMakerService,
    private readonly marketFlow: MarketFlowService,
    private readonly tokenService: TokenCryptoService,
    private readonly tokenLogService: TokenCryptoLogService,
  ) {}

  onModuleInit(): void {
    this.mmControl.registerTradePriceWalkHook((token, from, to) =>
      this.walkSpotToTarget(token, from, to, 0).then(() => undefined),
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Đặt giá tuyệt đối — walk nếu nhảy lớn và không có path driver. */
  async setPriceWithBookPath(
    token: TokenCrypto,
    targetPrice: number,
    logVolume = 0,
  ): Promise<SpotPathResult> {
    const fresh = await this.tokenService.findById(token.id);
    const prev =
      fresh?.price && fresh.price > 0
        ? fresh.price
        : token.price && token.price > 0
          ? token.price
          : 1;

    if (
      this.mmControl.hasActivePathDriver(token.id) ||
      !shouldWalkPricePath(prev, targetPrice)
    ) {
      // Triệt để: không kéo spot trực tiếp. Đặt target book = targetPrice rồi sweep để tạo fills.
      await this.walkSpotToTarget(fresh ?? token, prev, targetPrice, logVolume);
      const finalRow = await this.tokenService.findById(token.id);
      const final = Number(finalRow?.price ?? targetPrice);
      return { price: final, previous: prev, pathMode: 'instant' };
    }

    return this.walkSpotToTarget(fresh ?? token, prev, targetPrice, logVolume);
  }

  /** Nudge ±% — walk nếu biến động đủ lớn. */
  async nudgeWithBookPath(
    token: TokenCrypto,
    direction: 'up' | 'down',
    pct: number,
    logVolume = 0,
  ): Promise<SpotPathResult> {
    const fresh = await this.tokenService.findById(token.id);
    const prev =
      fresh?.price && fresh.price > 0
        ? fresh.price
        : token.price && token.price > 0
          ? token.price
          : 1;
    const factor = direction === 'up' ? 1 + pct : 1 - pct;
    const next = Number((prev * factor).toFixed(8));
    if (next <= 0) {
      throw new BadRequestException('Giá sau điều chỉnh không hợp lệ.');
    }

    if (
      this.mmControl.hasActivePathDriver(token.id) ||
      !shouldWalkPricePath(prev, next)
    ) {
      await this.walkSpotToTarget(fresh ?? token, prev, next, logVolume);
      const finalRow = await this.tokenService.findById(token.id);
      const final = Number(finalRow?.price ?? next);
      return { price: final, previous: prev, pathMode: 'instant' };
    }

    return this.walkSpotToTarget(fresh ?? token, prev, next, logVolume);
  }

  /**
   * Đi từng bước giá: mỗi bước cập nhật live spot, treo sổ MM, sweep flow.
   */
  async walkSpotToTarget(
    token: TokenCrypto,
    fromPrice: number,
    targetPrice: number,
    logVolume = 0,
  ): Promise<SpotPathResult> {
    const tokenId = token.id;
    if (this.walksInFlight.has(tokenId)) {
      this.logger.warn(`Path walk đang chạy — bỏ qua chồng ${tokenId}`);
      const row = await this.tokenService.findById(tokenId);
      return {
        price: Number(row?.price ?? targetPrice),
        previous: fromPrice,
        pathMode: 'instant',
      };
    }

    const cfg = pathWalkConfigFromEnv();
    const steps = computePricePathSteps(fromPrice, targetPrice, cfg);
    if (steps.length <= 1) {
      // 1 bước: vẫn phải có fill để tạo volume
      const dir = pricePathDirection(fromPrice, targetPrice);
      this.mmControl.patchToken(tokenId, {
        forceMid: targetPrice,
        targetPrice,
        midBiasPct: 0,
      });
      this.mmControl.setMid(tokenId, targetPrice);
      await this.marketMaker.triggerRefreshForToken(tokenId);
      const { fills, reached } = await this.marketFlow.sweepUntilSpotReaches(
        tokenId,
        dir,
        targetPrice,
        { maxFills: 200 },
      );
      if (fills <= 0 || !reached) {
        throw new BadRequestException(
          'Không thể tạo khớp lệnh để di chuyển giá (thiếu thanh khoản MM/flow).',
        );
      }
      if (logVolume > 0) {
        const row = await this.tokenService.findById(tokenId);
        const spot = Number(row?.price ?? targetPrice);
        await this.tokenLogService.createLog(tokenId, spot, logVolume);
        await this.tokenService.syncVolumesFromLogs(tokenId).catch(() => null);
      }
      this.mmControl.patchToken(tokenId, { forceMid: null, targetPrice: null });
      const row = await this.tokenService.findById(tokenId);
      return {
        price: Number(row?.price ?? targetPrice),
        previous: fromPrice,
        pathMode: 'instant',
      };
    }

    this.walksInFlight.add(tokenId);
    this.mmControl.beginPathWalk(tokenId);
    this.tokenService.cancelPricePersist(tokenId);
    const direction = pricePathDirection(fromPrice, targetPrice);
    const stepDelay = pathStepDelayMs();
    const minMovePct = Math.max(1e-8, Number(process.env.PATH_WALK_MIN_MOVE_PCT ?? '0.00002'));
    const maxExtraSweeps = Math.max(
      0,
      Math.min(8, Number(process.env.PATH_WALK_MAX_EXTRA_SWEEPS ?? '3')),
    );

    try {
      this.logger.log(
        `Path walk ${token.symbol ?? tokenId}: ${fromPrice} → ${targetPrice} (${steps.length} bước)`,
      );

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isLast = i === steps.length - 1;

        this.mmControl.patchToken(tokenId, {
          forceMid: step,
          targetPrice: step,
          midBiasPct: 0,
        });
        this.mmControl.setMid(tokenId, step);
        this.mmControl.setLastPathBookMid(tokenId, step);

        await this.marketMaker.triggerRefreshForToken(tokenId);
        let fills = await this.marketFlow.sweepAlongPath(tokenId, direction);

        // Giá phải xuất phát từ khớp lệnh. Nếu chưa nhích đủ (do sổ mỏng), sweep thêm vài lần.
        for (let s = 0; s < maxExtraSweeps; s++) {
          const row = await this.tokenService.findById(tokenId);
          const spot = Number(row?.price ?? 0);
          if (spot > 0) {
            const pct = Math.abs(spot - step) / Math.max(step, 1e-12);
            if (pct <= minMovePct) break;
          }
          fills += await this.marketFlow.sweepAlongPath(tokenId, direction);
        }

        // Triệt để: nếu step không tạo được khớp → không được phép đi tiếp (tránh candle ngắt quãng).
        if (fills <= 0) {
          throw new BadRequestException(
            `Không tạo được khớp lệnh ở step=${step} (thiếu thanh khoản MM/flow)`,
          );
        }

        // Bắt buộc spot đi qua step (trong biên nhỏ) bằng fills thực.
        const { fills: stepFills, reached } =
          await this.marketFlow.sweepUntilSpotReaches(
            tokenId,
            direction,
            step,
            { maxFills: 300, epsPct: 0.00002 },
          );
        if (!reached) {
          throw new BadRequestException(
            `Spot chưa chạm step=${step} sau ${stepFills} fill bổ sung (thiếu thanh khoản)`,
          );
        }

        if (!isLast) {
          await this.delay(stepDelay);
        }
      }

      this.tokenService.cancelPricePersist(tokenId);
      // Clear forced mid overrides; giữ spot theo last trade (đã persist qua matchOrders).
      this.mmControl.patchToken(tokenId, { forceMid: null, targetPrice: null });
      if (logVolume > 0) {
        const row = await this.tokenService.findById(tokenId);
        const spot = Number(row?.price ?? targetPrice);
        await this.tokenLogService.createLog(tokenId, spot, logVolume);
        await this.tokenService.syncVolumesFromLogs(tokenId).catch(() => null);
      }

      const finalRow = await this.tokenService.findById(tokenId);
      const finalSpot = Number(finalRow?.price ?? targetPrice);
      return {
        price: finalSpot,
        previous: fromPrice,
        pathMode: 'walk',
        pathSteps: steps.length,
      };
    } finally {
      this.mmControl.endPathWalk(tokenId);
      this.walksInFlight.delete(tokenId);
      this.mmControl.clearPathBookMid(tokenId);
    }
  }
}
