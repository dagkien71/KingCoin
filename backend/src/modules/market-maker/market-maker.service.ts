import { OrderService } from '@modules/order/order.service';
import { RealtimeService } from '@modules/realtime/realtime.service';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { MmControlService } from '@modules/market-maker/mm-control.service';
import {
  isQuoteToken,
  resolveMmTargetTokenNames,
} from '@modules/market-maker/liquidity-target-tokens.util';
import { PrismaService } from '@providers/prisma';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TokenCrypto, User } from '@prisma/client';

/**
 * Market maker đơn giản: một user riêng treo nhiều lệnh giới hạn hai phía quanh giá niêm yết.
 * Engine khớp lệnh bỏ qua cặp cùng userId — MM phải là user khác trader.
 *
 * Bật:
 * - Production: MARKET_MAKER_ENABLED=true
 * - Dev local: mặc định BẬT nếu không set; tắt bằng MARKET_MAKER_ENABLED=false
 *
 * User: node scripts/ensure-market-maker-user.js
 */
@Injectable()
export class MarketMakerService implements OnModuleInit {
  private readonly logger = new Logger(MarketMakerService.name);
  private refreshInFlight = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    private readonly realtimeService: RealtimeService,
    private readonly mmControl: MmControlService,
    private readonly tokenCryptoService: TokenCryptoService,
  ) {}

  /** Gọi từ admin — refresh sổ lệnh mọi token MM. */
  async triggerRefresh(): Promise<void> {
    await this.refreshLiquidity();
  }

  /** Refresh MM chỉ một token (theo id). */
  async triggerRefreshForToken(tokenId: string): Promise<void> {
    if (!this.mmControl.isMmEnabled()) {
      return;
    }
    const mmUser = await this.prisma.user.findFirst({
      where: { email: this.mmEmail() },
    });
    if (!mmUser) {
      return;
    }
    const token = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
    });
    if (!token?.id || isQuoteToken(token)) {
      return;
    }
    if (this.mmControl.isTokenPaused(token.id)) {
      return;
    }
    const params = this.mmControl.resolveParams(token.id);
    await this.refreshLiquidityForToken(mmUser, token, params);
  }

  private mmEmail(): string {
    return process.env.MARKET_MAKER_EMAIL ?? 'marketmaker@kingcoin.local';
  }

  private async resolveMmUser(): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: this.mmEmail() },
    });
  }

  /** Hủy mọi lệnh MM đang treo (pending) cho một token — trước khi đổi giá đột ngột. */
  async cancelPendingOrdersForToken(tokenId: string): Promise<number> {
    const n = await this.mmControl.cancelPendingOrdersForToken(tokenId);
    if (n > 0) {
      this.logger.log(
        `MM: hủy ${n} lệnh chờ token=${tokenId} (đổi giá / combo)`,
      );
    }
    return n;
  }

  private quotePairSuffix(): string {
    return process.env.QUOTE_DISPLAY_SYMBOL?.trim() || 'KC';
  }

  /** Mặc định mỗi 1s — giảm tải bằng MARKET_MAKER_INTERVAL_MS (ms), tối thiểu 500ms. */
  private refreshIntervalMs(): number {
    const raw = Number(process.env.MARKET_MAKER_INTERVAL_MS ?? '1000');
    return Math.max(500, Number.isFinite(raw) ? raw : 1000);
  }

  private priceTick(referencePrice: number): number {
    if (!referencePrice || referencePrice <= 0) return 0.0001;
    const relative = referencePrice / 2000;
    return Math.max(1e-8, Math.min(relative, referencePrice / 50));
  }

  private roundToTick(price: number, tick: number): number {
    if (tick <= 0) return Number(price.toFixed(8));
    return Number((Math.round(price / tick) * tick).toFixed(8));
  }

  onModuleInit(): void {
    if (!this.mmControl.isMmEnabled()) {
      return;
    }

    const intervalMs = this.refreshIntervalMs();
    this.logger.log(
      `MM: enabled (interval ${intervalMs}ms, cron 45s dự phòng)`,
    );

    setTimeout(() => void this.refreshLiquidity(), 400);

    // Chạy liên tục để luôn có lệnh treo gần giá hiện tại
    this.intervalHandle = setInterval(() => {
      void this.refreshLiquidity();
    }, intervalMs);
  }

  /** Mặc định 45 giây / lần — @Cron phải literal. */
  @Cron('*/45 * * * * *')
  async refreshLiquidity(): Promise<void> {
    if (!this.mmControl.isMmEnabled()) {
      return;
    }

    if (this.refreshInFlight) {
      return;
    }
    this.refreshInFlight = true;

    const mmEmail =
      process.env.MARKET_MAKER_EMAIL ?? 'marketmaker@kingcoin.local';

    try {
      const mmUser = await this.prisma.user.findFirst({
        where: { email: mmEmail },
      });
      if (!mmUser) {
        this.logger.warn(
          `Market maker: không tìm thấy user ${mmEmail} — chạy node scripts/ensure-market-maker-user.js`,
        );
        return;
      }

      const tokenNames = new Set(await resolveMmTargetTokenNames(this.prisma));
      for (const id of this.mmControl.getOverrideTokenIds()) {
        const t = await this.prisma.tokenCrypto.findUnique({
          where: { id },
          select: { name: true, symbol: true, tokenKind: true },
        });
        if (t?.name && !isQuoteToken(t)) tokenNames.add(t.name);
      }
      let anyToken = false;

      for (const tokenName of tokenNames) {
        const token = await this.prisma.tokenCrypto.findFirst({
          where: { name: tokenName },
        });
        if (!token?.id) {
          this.logger.warn(
            `Market maker: bỏ qua — không có token name="${tokenName}"`,
          );
          continue;
        }
        if (isQuoteToken(token)) {
          continue;
        }
        if (this.mmControl.isTokenPaused(token.id)) {
          continue;
        }
        anyToken = true;
        const params = this.mmControl.resolveParams(token.id);
        await this.refreshLiquidityForToken(mmUser, token, params);
      }

      if (!anyToken) {
        this.logger.warn(
          `Market maker: không có token base — seed token hoặc set MARKET_MAKER_TOKEN_NAMES`,
        );
      }
    } catch (e) {
      this.logger.error(`Market maker lỗi: ${(e as Error).message}`);
    } finally {
      this.refreshInFlight = false;
    }
  }

  private async refreshLiquidityForToken(
    mmUser: User,
    token: TokenCrypto,
    params: {
      levels: number;
      spreadStep: number;
      qty: number;
      oscillatePct: number;
      levelJitterPct: number;
      wanderPct: number;
    },
  ): Promise<void> {
    const {
      levels,
      spreadStep,
      qty,
      oscillatePct,
      levelJitterPct,
      wanderPct,
    } = params;
    const symbol = token.symbol ?? 'BASE';
    const quoteSym = this.quotePairSuffix();
    if (isQuoteToken(token)) {
      return;
    }
    const pair = `${symbol}/${quoteSym}`;

    const fresh = await this.prisma.tokenCrypto.findUnique({
      where: { id: token.id },
      select: { price: true, volumes: true },
    });
    const baseMid =
      fresh?.price && fresh.price > 0
        ? fresh.price
        : token.price && token.price > 0
          ? token.price
          : 1;
    const tick = this.priceTick(baseMid);
    const scheduledMid = this.mmControl.getScheduledMid(token.id);
    const spotAnchor = this.mmControl.getSpotAnchor(token.id);
    let mid: number;
    let modeLabel = 'thường';

    if (scheduledMid != null) {
      mid = scheduledMid;
      modeLabel = 'lịch giá';
    } else if (spotAnchor != null && spotAnchor > 0) {
      const t = Date.now() / 120000;
      const drift =
        oscillatePct * Math.sin(t) +
        oscillatePct * 0.35 * Math.sin(t * 2.31 + 0.7);
      mid = spotAnchor * (1 + drift);
      const wander = (Math.random() * 2 - 1) * wanderPct * 0.25;
      mid = mid * (1 + wander);
      mid = this.mmControl.finalizeMid(token.id, mid, baseMid);
      modeLabel = 'neo giá';
    } else {
      const t = Date.now() / 120000;
      const drift =
        oscillatePct * Math.sin(t) +
        oscillatePct * 0.35 * Math.sin(t * 2.31 + 0.7);
      mid = this.mmControl.getInitialMid(token.id, baseMid, drift);
      const wander = (Math.random() * 2 - 1) * wanderPct;
      mid = mid * (1 + wander) * 0.65 + baseMid * (1 + drift) * 0.35;
      mid = this.mmControl.finalizeMid(token.id, mid, baseMid);
    }

    await this.cancelPendingOrdersForToken(token.id);

    const qtyBase = qty;
    for (let i = 1; i <= levels; i++) {
      const offset = spreadStep * i;
      const buyJitter = (Math.random() * 2 - 1) * levelJitterPct;
      const sellJitter = (Math.random() * 2 - 1) * levelJitterPct;
      let buyPrice = this.roundToTick(
        mid * (1 - offset + buyJitter),
        tick,
      );
      let sellPrice = this.roundToTick(
        mid * (1 + offset + sellJitter),
        tick,
      );

      if (buyPrice <= 0 || sellPrice <= 0) continue;
      if (buyPrice >= sellPrice) {
        buyPrice = this.roundToTick(mid * (1 - offset), tick);
        sellPrice = this.roundToTick(mid * (1 + offset), tick);
      }
      if (buyPrice >= sellPrice) continue;

      const levelQty = Number(
        (qtyBase * (0.88 + Math.random() * 0.24)).toFixed(4),
      );

      await this.orderService.create({
        tokenId: token.id,
        type: 'buy',
        price: buyPrice,
        quantity: levelQty,
        pair,
        user: { connect: { id: mmUser.id } },
      });

      await this.orderService.create({
        tokenId: token.id,
        type: 'sell',
        price: sellPrice,
        quantity: levelQty,
        pair,
        user: { connect: { id: mmUser.id } },
      });
    }

    this.realtimeService.broadcastOrderbook(token.id);

    const pathActive = this.mmControl.hasActivePathDriver(token.id);
    const volumes = fresh?.volumes ?? token.volumes;
    if (!pathActive && !this.mmControl.shouldProtectSpot(token.id)) {
      const blend = 0.14;
      const nextSpot = Number((baseMid * (1 - blend) + mid * blend).toFixed(8));
      if (Math.abs(nextSpot - baseMid) / baseMid > 1e-7) {
        this.tokenCryptoService.updatePriceLive(token.id, nextSpot, {
          tickerPrice: mid,
          volumes,
        });
      } else {
        this.realtimeService.emitTickerFast(token.id, {
          price: mid,
          volumes,
        });
      }
    } else {
      this.realtimeService.emitTickerFast(token.id, {
        price: mid,
        volumes,
      });
    }

    this.logger.log(
      `MM: ${token.name} — ${levels} bậc × 2 phía quanh mid=${mid} (DB ${baseMid}, ${modeLabel}) (${pair}), qty≈${qty}`,
    );
  }
}
