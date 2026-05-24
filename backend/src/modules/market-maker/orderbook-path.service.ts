import { TokenCryptoLogService } from '@modules/token-crypto/token-log.service';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { Injectable, Logger } from '@nestjs/common';
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
export class OrderbookPathService {
  private readonly logger = new Logger(OrderbookPathService.name);
  private readonly walksInFlight = new Set<string>();

  constructor(
    private readonly mmControl: MmControlService,
    private readonly marketMaker: MarketMakerService,
    private readonly marketFlow: MarketFlowService,
    private readonly tokenService: TokenCryptoService,
    private readonly tokenLogService: TokenCryptoLogService,
  ) {}

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
      const updated = await this.mmControl.setSpotPrice(
        fresh ?? token,
        targetPrice,
        logVolume,
      );
      return {
        price: updated.price ?? targetPrice,
        previous: prev,
        pathMode: 'instant',
      };
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
      throw new Error('Giá sau điều chỉnh không hợp lệ');
    }

    if (
      this.mmControl.hasActivePathDriver(token.id) ||
      !shouldWalkPricePath(prev, next)
    ) {
      const updated = await this.mmControl.setSpotPrice(
        fresh ?? token,
        next,
        logVolume,
      );
      return {
        price: updated.price ?? next,
        previous: prev,
        pathMode: 'instant',
      };
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
      const updated = await this.mmControl.setSpotPrice(token, targetPrice, logVolume);
      return {
        price: updated.price ?? targetPrice,
        previous: fromPrice,
        pathMode: 'instant',
      };
    }

    const cfg = pathWalkConfigFromEnv();
    const steps = computePricePathSteps(fromPrice, targetPrice, cfg);
    if (steps.length <= 1) {
      const updated = await this.mmControl.setSpotPrice(token, targetPrice, logVolume);
      return {
        price: updated.price ?? targetPrice,
        previous: fromPrice,
        pathMode: 'instant',
      };
    }

    this.walksInFlight.add(tokenId);
    this.mmControl.beginPathWalk(tokenId);
    this.tokenService.cancelPricePersist(tokenId);
    const direction = pricePathDirection(fromPrice, targetPrice);
    const stepDelay = pathStepDelayMs();

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

        const row = await this.tokenService.findById(tokenId);
        const volumes = row?.volumes ?? token.volumes;
        await this.tokenService.updatePriceLive(tokenId, step, { volumes });

        if (isLast && logVolume > 0) {
          await this.tokenLogService.createLog(tokenId, step, logVolume);
          await this.tokenService.syncVolumesFromLogs(tokenId).catch(() => null);
        }

        await this.marketMaker.triggerRefreshForToken(tokenId);
        await this.marketFlow.sweepAlongPath(tokenId, direction, 2);

        if (!isLast) {
          await this.delay(stepDelay);
        }
      }

      this.tokenService.cancelPricePersist(tokenId);
      const finalRow = await this.tokenService.findById(tokenId);
      const finalToken = finalRow ?? token;
      await this.mmControl.setSpotPrice(finalToken, targetPrice, logVolume);
      await this.tokenService.flushPricePersist(tokenId, targetPrice);

      return {
        price: targetPrice,
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
