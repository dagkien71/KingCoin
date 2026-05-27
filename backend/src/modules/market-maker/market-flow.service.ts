import {
  flowLiquidityEmails,
  mmLiquidityEmails,
} from '@modules/market-maker/liquidity-bots.util';
import { MmBotRegistryService } from '@modules/market-maker/mm-bot-registry.service';
import { MmControlService } from '@modules/market-maker/mm-control.service';
import {
  isQuoteToken,
  resolveFlowBaseTokenNames,
} from '@modules/market-maker/liquidity-target-tokens.util';
import {
  flowMatchesBothSidesFromProfile,
  flowPassesPerTickFromProfile,
  flowSweepMaxFillsFromProfile,
} from '@modules/market-maker/flow-activity.util';
import { setLastFlowDirection } from '@modules/market-maker/flow-direction.util';
import { PlatformLiquiditySettingsService } from '@modules/market-maker/platform-liquidity-settings.service';
import { OrderService } from '@modules/order/order.service';
import { PrismaService } from '@providers/prisma';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TokenCrypto } from '@prisma/client';

/**
 * Bot taker: user riêng luân phiên **mua từ lệnh bán MM** và **bán vào lệnh mua MM**
 * → khớp lệnh liên tục (không dùng cùng userId với MM).
 *
 * Chuẩn bị: `node scripts/ensure-flow-trader-user.js`
 *
 * Bật: cùng logic MM (`MARKET_MAKER_ENABLED` / dev mặc định). Tắt riêng: `MARKET_FLOW_ENABLED=false`.
 */
@Injectable()
export class MarketFlowService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketFlowService.name);
  private tick = 0;
  private intervalHandle: NodeJS.Timeout | null = null;
  private runInFlight = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly mmControl: MmControlService,
    private readonly mmBotRegistry: MmBotRegistryService,
    private readonly platformSettings: PlatformLiquiditySettingsService,
  ) {}

  private flowIntervalMs(): number {
    return this.platformSettings.getEffective().flowIntervalMs;
  }

  private flowQty(): number {
    return this.platformSettings.getEffective().flowQty;
  }

  sweepMaxFills(): number {
    return flowSweepMaxFillsFromProfile(
      this.platformSettings.resolveFlowProfile(),
    );
  }

  private startFlowLoop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (!this.mmControl.isFlowEnabled()) {
      this.logger.log('Flow: tắt — không chạy interval');
      return;
    }
    const ms = this.flowIntervalMs();
    this.logger.log(`Market flow (taker): interval ${ms}ms`);
    this.intervalHandle = setInterval(() => {
      void this.runTick();
    }, ms);
  }

  reconfigureLoop(): void {
    this.startFlowLoop();
  }

  private quotePair(token: TokenCrypto): string {
    const sym = token.symbol ?? 'BASE';
    const q = process.env.QUOTE_DISPLAY_SYMBOL?.trim() || 'KC';
    return `${sym}/${q}`;
  }

  onModuleInit(): void {
    this.platformSettings.onIntervalsChanged(() => this.reconfigureLoop());
    if (!this.mmControl.isFlowEnabled()) return;
    setTimeout(() => void this.runTick(), 600);
    this.startFlowLoop();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Khớp vài lệnh MM theo hướng path (pump → mua ask, dump → bán bid).
   * Gọi từ OrderbookPathService hoặc hook path driver.
   */
  async sweepAlongPath(
    tokenId: string,
    direction: 'up' | 'down',
    maxFills?: number,
  ): Promise<number> {
    const cap = maxFills ?? this.sweepMaxFills();
    if (!this.mmControl.isFlowEnabled() || cap < 1) return 0;

    const qtyFlow = this.flowQty();
    const mmIds = await this.resolveMmUserIds();
    const flowUser = await this.resolveFlowUserForTick();
    const token = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
    });

    if (mmIds.length === 0 || !flowUser || !token?.id) return 0;
    if (this.mmControl.shouldProtectSpot(tokenId)) return 0;

    const pair = this.quotePair(token);
    let fills = 0;

    for (let i = 0; i < cap; i++) {
      if (direction === 'up') {
        const bestSell = await this.prisma.order.findFirst({
          where: {
            userId: { in: mmIds },
            tokenId,
            type: 'sell',
            status: 'pending',
            quantity: { gt: 0 },
          },
          orderBy: { price: 'asc' },
        });
        if (!bestSell) break;
        const q = Math.min(qtyFlow, bestSell.quantity);
        if (q <= 0) break;
        await this.orderService.create({
          tokenId,
          type: 'buy',
          price: bestSell.price,
          quantity: q,
          pair,
          user: { connect: { id: flowUser.id } },
        });
        setLastFlowDirection(tokenId, 'up');
        fills++;
      } else {
        const bestBuy = await this.prisma.order.findFirst({
          where: {
            userId: { in: mmIds },
            tokenId,
            type: 'buy',
            status: 'pending',
            quantity: { gt: 0 },
          },
          orderBy: { price: 'desc' },
        });
        if (!bestBuy) break;
        const q = Math.min(qtyFlow, bestBuy.quantity);
        if (q <= 0) break;
        await this.orderService.create({
          tokenId,
          type: 'sell',
          price: bestBuy.price,
          quantity: q,
          pair,
          user: { connect: { id: flowUser.id } },
        });
        setLastFlowDirection(tokenId, 'down');
        fills++;
      }
    }

    return fills;
  }

  /**
   * Dùng trade thật để kéo giá tiến dần tới `targetPrice`.
   * - direction=up: liên tục mua best ask (MM sell) cho tới khi spot >= targetPrice
   * - direction=down: liên tục bán best bid (MM buy) cho tới khi spot <= targetPrice
   *
   * Trả về số fills đã tạo.
   */
  async sweepUntilSpotReaches(
    tokenId: string,
    direction: 'up' | 'down',
    targetPrice: number,
    opts?: { maxFills?: number; epsPct?: number },
  ): Promise<number> {
    const maxFills = Math.max(1, Math.min(10_000, opts?.maxFills ?? 200));
    const epsPct = Math.max(1e-9, opts?.epsPct ?? 0.00001);
    if (!this.mmControl.isFlowEnabled()) return 0;
    if (targetPrice <= 0) return 0;

    const mmIds = await this.resolveMmUserIds();
    const flowUser = await this.resolveFlowUserForTick();
    if (mmIds.length === 0 || !flowUser) return 0;
    if (this.mmControl.shouldProtectSpot(tokenId)) return 0;

    let fills = 0;
    for (let i = 0; i < maxFills; i++) {
      const row = await this.prisma.tokenCrypto.findUnique({
        where: { id: tokenId },
        select: { price: true, symbol: true, name: true, tokenKind: true },
      });
      const spot = Number(row?.price ?? 0);
      if (spot > 0) {
        const done =
          direction === 'up'
            ? spot >= targetPrice * (1 - epsPct)
            : spot <= targetPrice * (1 + epsPct);
        if (done) break;
      }

      // mỗi fill đặt lệnh market theo best bid/ask hiện tại (đã có sổ MM)
      const ok = await this.tryTakerFill(
        mmIds,
        flowUser.id,
        // tokenKind để isQuoteToken skip — nhưng tokenId ở đây luôn base do caller
        (row as any) ?? ({ id: tokenId } as any),
        direction === 'up' ? 'buy' : 'sell',
        this.flowQty(),
      );
      if (!ok) break;
      fills++;
    }
    return fills;
  }

  private async tryTakerFill(
    mmIds: string[],
    flowUserId: string,
    token: TokenCrypto,
    side: 'buy' | 'sell',
    qtyFlow: number,
  ): Promise<boolean> {
    const pair = this.quotePair(token);
    if (side === 'buy') {
      const bestSell = await this.prisma.order.findFirst({
        where: {
          userId: { in: mmIds },
          tokenId: token.id,
          type: 'sell',
          status: 'pending',
          quantity: { gt: 0 },
        },
        orderBy: { price: 'asc' },
      });
      if (!bestSell) return false;
      const q = Math.min(qtyFlow, bestSell.quantity);
      if (q <= 0) return false;
      await this.orderService.create({
        tokenId: token.id,
        type: 'buy',
        price: bestSell.price,
        quantity: q,
        pair,
        user: { connect: { id: flowUserId } },
      });
      setLastFlowDirection(token.id, 'up');
      this.logger.debug(
        `Flow: mua từ MM sell @${bestSell.price} qty=${q} (${token.name})`,
      );
      return true;
    }

    const bestBuy = await this.prisma.order.findFirst({
      where: {
        userId: { in: mmIds },
        tokenId: token.id,
        type: 'buy',
        status: 'pending',
        quantity: { gt: 0 },
      },
      orderBy: { price: 'desc' },
    });
    if (!bestBuy) return false;
    const q = Math.min(qtyFlow, bestBuy.quantity);
    if (q <= 0) return false;
    await this.orderService.create({
      tokenId: token.id,
      type: 'sell',
      price: bestBuy.price,
      quantity: q,
      pair,
      user: { connect: { id: flowUserId } },
    });
    setLastFlowDirection(token.id, 'down');
    this.logger.debug(
      `Flow: bán vào MM buy @${bestBuy.price} qty=${q} (${token.name})`,
    );
    return true;
  }

  private async runTick(): Promise<void> {
    if (!this.mmControl.isFlowEnabled() || this.runInFlight) return;
    this.runInFlight = true;

    const qtyFlow = this.flowQty();
    const flowProfile = this.platformSettings.resolveFlowProfile();
    const bothSides = flowMatchesBothSidesFromProfile(flowProfile);
    const passes = flowPassesPerTickFromProfile(flowProfile);

    try {
      const mmIds = await this.resolveMmUserIds();
      const flowUser = await this.resolveFlowUserForTick();

      if (mmIds.length === 0) {
        this.logger.debug(
          `Flow: không có MM — ${mmLiquidityEmails().join(', ')}`,
        );
        return;
      }
      if (!flowUser) {
        this.logger.warn(
          `Flow: không có user taker — chạy node scripts/ensure-liquidity-bots.js`,
        );
        return;
      }

      this.tick++;
      const buyTurn = this.tick % 2 === 1;

      const baseNames = await resolveFlowBaseTokenNames(this.prisma);
      for (let pass = 0; pass < passes; pass++) {
        for (const tokenName of baseNames) {
          const token = await this.prisma.tokenCrypto.findFirst({
            where: { name: tokenName },
          });
          if (!token?.id) continue;
          if (isQuoteToken(token)) continue;

          if (this.mmControl.shouldProtectSpot(token.id)) {
            continue;
          }

          if (bothSides) {
            await this.tryTakerFill(mmIds, flowUser.id, token, 'buy', qtyFlow);
            await this.tryTakerFill(mmIds, flowUser.id, token, 'sell', qtyFlow);
          } else if (buyTurn) {
            await this.tryTakerFill(mmIds, flowUser.id, token, 'buy', qtyFlow);
          } else {
            await this.tryTakerFill(mmIds, flowUser.id, token, 'sell', qtyFlow);
          }
        }
      }
    } catch (e) {
      this.logger.warn(`Flow tick: ${(e as Error).message}`);
    } finally {
      this.runInFlight = false;
    }
  }

  private async resolveMmUserIds(): Promise<string[]> {
    const emails = mmLiquidityEmails();
    const rows = await this.prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true },
    });
    return rows
      .filter((r) => this.mmBotRegistry.isBotEnabled(r.email, 'mm'))
      .map((r) => r.id);
  }

  private async resolveFlowUserForTick() {
    const emails = flowLiquidityEmails();
    const rows = await this.prisma.user.findMany({
      where: { email: { in: emails } },
    });
    const enabled = rows.filter((u) =>
      this.mmBotRegistry.isBotEnabled(u.email, 'flow'),
    );
    if (enabled.length === 0) return null;
    return enabled[this.tick % enabled.length];
  }
}
