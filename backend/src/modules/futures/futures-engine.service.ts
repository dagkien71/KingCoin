import { NotificationService } from '@modules/notification/notification.service';
import { futuresDeeplink } from '../../common/token-route.util';
import { LedgerService } from '@modules/ledger/ledger.service';
import { TradingFeeService } from '@modules/fees/trading-fee.service';
import { MarkPriceService } from '@modules/futures/mark-price.service';
import { FuturesConfigService } from '@modules/futures/futures-config.service';
import {
  closeReturnKc,
  marginFromSize,
  marginRatio,
  resolveMarginPortionKc,
  sizeFromMargin,
  unrealizedPnlKc,
  estimateLiqPrice,
  isStopLossHit,
  isTakeProfitHit,
  validateTpSlPrices,
  mergeEntryPrice,
  effectiveLeverage,
} from '@modules/futures/futures-math.util';
import { FUTURES_POSITION_NOT_FOUND } from '@constants/errors.constants';
import { PortfolioPnlService } from '@modules/user/portfolio-pnl.service';
import { UserRepository } from '@modules/user/user.repository';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FuturesOrderStatus,
  FuturesOrderType,
  FuturesPositionStatus,
  FuturesSide,
  NotificationPriority,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@providers/prisma';

export type PositionView = {
  id: string;
  tokenId: string;
  symbol: string | null;
  side: FuturesSide;
  size: number;
  entryPrice: number;
  leverage: number;
  marginKc: number;
  markPrice: number;
  unrealizedPnlKc: number;
  marginRatio: number;
  liquidationPrice: number;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  status: FuturesPositionStatus;
  openedAt: Date;
};

export type ClosedPositionView = {
  id: string;
  tokenId: string;
  symbol: string | null;
  side: FuturesSide;
  leverage: number;
  entryPrice: number;
  exitPrice: number | null;
  closedSize: number | null;
  realizedPnlKc: number;
  status: FuturesPositionStatus;
  openedAt: Date;
  closedAt: Date | null;
  liquidatedAt: Date | null;
};

export type FuturesOrderView = {
  id: string;
  positionId: string | null;
  tokenId: string;
  symbol: string | null;
  side: FuturesSide;
  type: FuturesOrderType;
  status: FuturesOrderStatus;
  size: number;
  leverage: number | null;
  marginKc: number | null;
  filledPrice: number | null;
  filledAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class FuturesEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly tokenCryptoService: TokenCryptoService,
    private readonly markPrice: MarkPriceService,
    private readonly configService: FuturesConfigService,
    private readonly ledgerService: LedgerService,
    private readonly tradingFees: TradingFeeService,
    private readonly portfolioPnl: PortfolioPnlService,
    private readonly notifications: NotificationService,
  ) {}

  async getMarkPrice(tokenId: string) {
    const markPrice = await this.markPrice.getMarkPrice(tokenId);
    return { tokenId, markPrice, at: Date.now() };
  }

  async listOpenPositions(userId: string): Promise<PositionView[]> {
    const rows = await this.prisma.futuresPosition.findMany({
      where: { userId, status: FuturesPositionStatus.open },
      orderBy: { openedAt: 'desc' },
    });
    const views: PositionView[] = [];
    for (const p of rows) {
      views.push(await this.toPositionView(p));
    }
    return views;
  }

  async listPositionHistory(
    userId: string,
    limit = 50,
  ): Promise<ClosedPositionView[]> {
    const rows = await this.prisma.futuresPosition.findMany({
      where: {
        userId,
        status: {
          in: [
            FuturesPositionStatus.closed,
            FuturesPositionStatus.liquidated,
          ],
        },
      },
      orderBy: { closedAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });
    const views: ClosedPositionView[] = [];
    for (const p of rows) {
      const token = await this.tokenCryptoService.findOne(p.tokenId);
      views.push({
        id: p.id,
        tokenId: p.tokenId,
        symbol: token?.symbol ?? null,
        side: p.side,
        leverage: p.leverage,
        entryPrice: p.entryPrice,
        exitPrice: p.exitPrice ?? null,
        closedSize: p.closedSize ?? null,
        realizedPnlKc: p.realizedPnlKc,
        status: p.status,
        openedAt: p.openedAt,
        closedAt: p.closedAt,
        liquidatedAt: p.liquidatedAt,
      });
    }
    return views;
  }

  async listOrders(userId: string, limit = 50): Promise<FuturesOrderView[]> {
    const rows = await this.prisma.futuresOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, limit)),
    });
    const views: FuturesOrderView[] = [];
    for (const o of rows) {
      const token = await this.tokenCryptoService.findOne(o.tokenId);
      views.push({
        id: o.id,
        positionId: o.positionId,
        tokenId: o.tokenId,
        symbol: token?.symbol ?? null,
        side: o.side,
        type: o.type,
        status: o.status,
        size: o.size,
        leverage: o.leverage,
        marginKc: o.marginKc,
        filledPrice: o.filledPrice,
        filledAt: o.filledAt,
        createdAt: o.createdAt,
      });
    }
    return views;
  }

  async openMarket(params: {
    userId: string;
    tokenId: string;
    side: FuturesSide;
    leverage: number;
    marginKc?: number;
    size?: number;
    takeProfitPrice?: number | null;
    stopLossPrice?: number | null;
  }) {
    const { userId, tokenId, side, leverage } = params;
    const quoteId = await this.userRepository.getQuoteTokenId();
    if (!quoteId) {
      throw new BadRequestException('Chưa cấu hình KC.');
    }
    if (quoteId === tokenId) {
      throw new BadRequestException('Không mở hợp đồng trên KC.');
    }

    const token = await this.tokenCryptoService.findOne(tokenId);
    if (!token) throw new NotFoundException('Token không tồn tại.');
    if (token.tokenKind === 'stablecoin') {
      throw new BadRequestException('Không mở futures trên stablecoin.');
    }

    const cfg = await this.configService.getForToken(tokenId);
    if (!cfg.enabled) {
      throw new BadRequestException('Futures chưa bật cho token này.');
    }
    if (leverage < 1 || leverage > cfg.maxLeverage) {
      throw new BadRequestException(
        `Đòn bẩy phải từ 1 đến ${cfg.maxLeverage}.`,
      );
    }

    const existing = await this.prisma.futuresPosition.findFirst({
      where: {
        userId,
        tokenId,
        side,
        status: FuturesPositionStatus.open,
      },
    });

    const mark = await this.markPrice.getMarkPrice(tokenId);
    let tpSl: { takeProfitPrice: number | null; stopLossPrice: number | null };
    try {
      tpSl = validateTpSlPrices(params.side, mark, {
        takeProfitPrice: params.takeProfitPrice,
        stopLossPrice: params.stopLossPrice,
      });
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'TP/SL không hợp lệ.',
      );
    }
    let size = params.size;
    let marginKc = params.marginKc;
    if (size != null && size > 0) {
      marginKc = marginFromSize(size, leverage, mark);
    } else if (marginKc != null && marginKc > 0) {
      size = sizeFromMargin(marginKc, leverage, mark);
    } else {
      throw new BadRequestException('Nhập marginKc hoặc size.');
    }

    if (!size || size <= 0 || !marginKc || marginKc <= 0) {
      throw new BadRequestException('Số lượng không hợp lệ.');
    }
    if (marginKc < cfg.minMarginKc - 1e-9) {
      throw new BadRequestException(
        `Margin tối thiểu ${cfg.minMarginKc} KC.`,
      );
    }
    if (size < cfg.minSize - 1e-12) {
      throw new BadRequestException(`Size tối thiểu ${cfg.minSize}.`);
    }

    if (existing) {
      return this.addToOpenPosition({
        userId,
        tokenId,
        side,
        existing,
        addSize: size,
        addMarginKc: marginKc,
        mark,
        tpSl,
        cfg,
        token,
        quoteId,
      });
    }

    const notional = size * mark;
    const openFee = this.tradingFees.futuresOpenFee(notional);
    const totalRequired = marginKc + openFee;

    const kc = await this.userRepository.getQuoteBalance(userId);
    if (kc < totalRequired - 1e-9) {
      throw new BadRequestException(
        `Không đủ KC. Cần ${totalRequired.toFixed(4)} KC (margin + phí mở), có ${kc.toFixed(4)}.`,
      );
    }

    await this.userRepository.adjustQuoteKcByUserId(userId, -marginKc);
    if (openFee > 0) {
      await this.tradingFees.collectKcFee({
        userId,
        quoteId,
        feeKc: openFee,
        refType: 'futures_open_fee',
        refId: tokenId,
        note: `Phí mở futures ${token.symbol ?? token.name ?? 'token'} ${side}`,
      });
    }

    const position = await this.prisma.futuresPosition.create({
      data: {
        userId,
        tokenId,
        side,
        size,
        entryPrice: mark,
        leverage,
        marginKc,
        takeProfitPrice: tpSl.takeProfitPrice,
        stopLossPrice: tpSl.stopLossPrice,
        status: FuturesPositionStatus.open,
      },
    });

    await this.prisma.futuresOrder.create({
      data: {
        userId,
        positionId: position.id,
        tokenId,
        side,
        type: FuturesOrderType.open_market,
        status: FuturesOrderStatus.filled,
        size,
        leverage,
        marginKc,
        filledPrice: mark,
        filledAt: new Date(),
      },
    });

    const sym = token.symbol ?? token.name ?? 'token';
    await this.ledgerService.append({
      userId,
      amount: -marginKc,
      currency: 'KC',
      tokenId: quoteId,
      refType: 'futures_margin_lock',
      refId: position.id,
      note: `Khóa margin futures ${sym} ${side}`,
    });

    await this.portfolioPnl.syncUserNavPnL(userId);

    const balances = await this.ledgerService.getBalances(userId);
    const view = await this.toPositionView(position);
    await this.notifications.notify({
      userId,
      type: NotificationType.FUTURES_OPENED,
      priority: NotificationPriority.normal,
      title: 'Mở vị thế futures',
      body: `${sym} ${side} — margin ${marginKc.toFixed(2)} KC, size ${size.toFixed(6)}`,
      dedupeKey: `FUTURES_OPENED:${position.id}`,
      payload: {
        deeplink: futuresDeeplink(token?.symbol, token?.name, tokenId),
        positionId: position.id,
        tokenId,
        symbol: sym,
        side,
        marginKc,
        size,
      },
    });
    return {
      position: view,
      balances,
      amountIn: marginKc,
      openFeeKc: openFee,
      size,
      markPrice: mark,
      merged: false,
    };
  }

  /** Cộng thêm cùng chiều — tính lại giá vào bình quân, size và margin. */
  private async addToOpenPosition(params: {
    userId: string;
    tokenId: string;
    side: FuturesSide;
    existing: {
      id: string;
      size: number;
      entryPrice: number;
      marginKc: number;
      takeProfitPrice: number | null;
      stopLossPrice: number | null;
    };
    addSize: number;
    addMarginKc: number;
    mark: number;
    tpSl: { takeProfitPrice: number | null; stopLossPrice: number | null };
    cfg: { maxLeverage: number };
    token: { symbol?: string | null; name?: string | null };
    quoteId: string;
  }) {
    const {
      userId,
      tokenId,
      side,
      existing,
      addSize,
      addMarginKc,
      mark,
      tpSl,
      cfg,
      token,
      quoteId,
    } = params;

    const mergedSize = existing.size + addSize;
    const mergedEntry = mergeEntryPrice(
      existing.size,
      existing.entryPrice,
      addSize,
      mark,
    );
    const mergedMargin = existing.marginKc + addMarginKc;
    const mergedLev = effectiveLeverage(
      mergedSize,
      mark,
      mergedMargin,
      cfg.maxLeverage,
    );

    const notional = addSize * mark;
    const openFee = this.tradingFees.futuresOpenFee(notional);
    const totalRequired = addMarginKc + openFee;

    const kc = await this.userRepository.getQuoteBalance(userId);
    if (kc < totalRequired - 1e-9) {
      throw new BadRequestException(
        `Không đủ KC. Cần ${totalRequired.toFixed(4)} KC (margin + phí mở), có ${kc.toFixed(4)}.`,
      );
    }

    await this.userRepository.adjustQuoteKcByUserId(userId, -addMarginKc);
    if (openFee > 0) {
      await this.tradingFees.collectKcFee({
        userId,
        quoteId,
        feeKc: openFee,
        refType: 'futures_open_fee',
        refId: existing.id,
        note: `Phí cộng thêm futures ${token.symbol ?? token.name ?? 'token'} ${side}`,
      });
    }

    let takeProfitPrice = existing.takeProfitPrice;
    let stopLossPrice = existing.stopLossPrice;
    if (
      tpSl.takeProfitPrice != null ||
      tpSl.stopLossPrice != null
    ) {
      takeProfitPrice = tpSl.takeProfitPrice ?? existing.takeProfitPrice;
      stopLossPrice = tpSl.stopLossPrice ?? existing.stopLossPrice;
    }

    const position = await this.prisma.futuresPosition.update({
      where: { id: existing.id },
      data: {
        size: mergedSize,
        entryPrice: mergedEntry,
        marginKc: mergedMargin,
        leverage: mergedLev,
        takeProfitPrice,
        stopLossPrice,
      },
    });

    await this.prisma.futuresOrder.create({
      data: {
        userId,
        positionId: position.id,
        tokenId,
        side,
        type: FuturesOrderType.open_market,
        status: FuturesOrderStatus.filled,
        size: addSize,
        leverage: mergedLev,
        marginKc: addMarginKc,
        filledPrice: mark,
        filledAt: new Date(),
      },
    });

    const sym = token.symbol ?? token.name ?? 'token';
    await this.ledgerService.append({
      userId,
      amount: -addMarginKc,
      currency: 'KC',
      tokenId: quoteId,
      refType: 'futures_margin_lock',
      refId: position.id,
      note: `Cộng margin futures ${sym} ${side}`,
    });

    await this.portfolioPnl.syncUserNavPnL(userId);

    const balances = await this.ledgerService.getBalances(userId);
    const view = await this.toPositionView(position);
    await this.notifications.notify({
      userId,
      type: NotificationType.FUTURES_OPENED,
      priority: NotificationPriority.normal,
      title: 'Cộng thêm vị thế futures',
      body: `${sym} ${side} — size ${mergedSize.toFixed(6)} (giá vào ~${mergedEntry.toFixed(4)} KC)`,
      dedupeKey: `FUTURES_ADD:${position.id}:${Date.now()}`,
      payload: {
        deeplink: futuresDeeplink(token?.symbol, token?.name, tokenId),
        positionId: position.id,
        tokenId,
        symbol: sym,
        side,
        marginKc: mergedMargin,
        size: mergedSize,
        merged: true,
      },
    });

    return {
      position: view,
      balances,
      amountIn: addMarginKc,
      openFeeKc: openFee,
      size: mergedSize,
      markPrice: mark,
      merged: true,
    };
  }

  /** Cập nhật / thêm / xoá TP-SL trên vị thế đang mở (không đóng vị thế). */
  async updatePositionTpSl(
    userId: string,
    positionId: string,
    input: {
      takeProfitPrice?: number | null;
      stopLossPrice?: number | null;
    },
  ): Promise<PositionView> {
    const position = await this.prisma.futuresPosition.findFirst({
      where: {
        id: positionId,
        userId,
        status: FuturesPositionStatus.open,
      },
    });
    if (!position) {
      throw new NotFoundException(FUTURES_POSITION_NOT_FOUND);
    }

    const mark = await this.markPrice.getMarkPrice(position.tokenId);
    const nextTp =
      input.takeProfitPrice !== undefined
        ? input.takeProfitPrice
        : position.takeProfitPrice;
    const nextSl =
      input.stopLossPrice !== undefined
        ? input.stopLossPrice
        : position.stopLossPrice;

    let tpSl: { takeProfitPrice: number | null; stopLossPrice: number | null };
    try {
      tpSl = validateTpSlPrices(position.side, mark, {
        takeProfitPrice: nextTp,
        stopLossPrice: nextSl,
      });
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'TP/SL không hợp lệ.',
      );
    }

    const updated = await this.prisma.futuresPosition.update({
      where: { id: position.id },
      data: {
        takeProfitPrice: tpSl.takeProfitPrice,
        stopLossPrice: tpSl.stopLossPrice,
      },
    });

    return this.toPositionView(updated);
  }

  async closeMarket(params: {
    userId: string;
    positionId: string;
    closeSize?: number | null;
    closeReason?: 'manual' | 'take_profit' | 'stop_loss';
  }) {
    const position = await this.prisma.futuresPosition.findFirst({
      where: {
        id: params.positionId,
        userId: params.userId,
        status: FuturesPositionStatus.open,
      },
    });
    if (!position) {
      throw new NotFoundException(FUTURES_POSITION_NOT_FOUND);
    }

    const quoteId = await this.userRepository.getQuoteTokenId();
    if (!quoteId) {
      throw new BadRequestException('Chưa cấu hình KC.');
    }

    const mark = await this.markPrice.getMarkPrice(position.tokenId);
    const closeSize = params.closeSize ?? position.size;
    if (closeSize <= 0 || closeSize > position.size + 1e-12) {
      throw new BadRequestException('closeSize không hợp lệ.');
    }

    const marginPortion = resolveMarginPortionKc({
      storedMarginKc: position.marginKc,
      closeSize,
      positionSize: position.size,
      leverage: position.leverage,
      entryPrice: position.entryPrice,
    });
    const uPnl = unrealizedPnlKc(
      position.side,
      closeSize,
      position.entryPrice,
      mark,
    );
    const closeNotional = closeSize * mark;
    const grossReturn = Math.max(0, closeReturnKc(marginPortion, uPnl));
    const closeFee = this.tradingFees.futuresCloseFee(closeNotional);
    const returnKc = Math.max(0, grossReturn - closeFee);

    await this.userRepository.adjustQuoteKcByUserId(params.userId, grossReturn);
    if (closeFee > 0) {
      await this.tradingFees.collectKcFee({
        userId: params.userId,
        quoteId,
        feeKc: closeFee,
        refType: 'futures_close_fee',
        refId: position.id,
        note: `Phí đóng futures`,
      });
    }

    const realized = position.realizedPnlKc + uPnl;
    const remaining = position.size - closeSize;

    if (remaining <= 1e-12) {
      await this.prisma.futuresPosition.update({
        where: { id: position.id },
        data: {
          size: 0,
          marginKc: 0,
          realizedPnlKc: realized,
          closedSize: closeSize,
          exitPrice: mark,
          status: FuturesPositionStatus.closed,
          closedAt: new Date(),
        },
      });
    } else {
      await this.prisma.futuresPosition.update({
        where: { id: position.id },
        data: {
          size: remaining,
          marginKc: position.marginKc - marginPortion,
          realizedPnlKc: realized,
        },
      });
    }

    await this.prisma.futuresOrder.create({
      data: {
        userId: params.userId,
        positionId: position.id,
        tokenId: position.tokenId,
        side: position.side,
        type: FuturesOrderType.close_market,
        status: FuturesOrderStatus.filled,
        size: closeSize,
        filledPrice: mark,
        filledAt: new Date(),
      },
    });

    const token = await this.tokenCryptoService.findOne(position.tokenId);
    const sym = token?.symbol ?? 'token';
    if (marginPortion > 1e-12) {
      await this.ledgerService.append({
        userId: params.userId,
        amount: marginPortion,
        currency: 'KC',
        tokenId: quoteId,
        refType: 'futures_margin_unlock',
        refId: position.id,
        note: `Hoàn margin futures ${sym}`,
      });
    }
    await this.ledgerService.append({
      userId: params.userId,
      amount: returnKc,
      currency: 'KC',
      tokenId: quoteId,
      refType: 'futures_close',
      refId: position.id,
      note: `Đóng futures ${sym}: margin ${marginPortion.toFixed(4)} + PnL ${uPnl.toFixed(4)} KC (trước phí ${grossReturn.toFixed(4)})`,
    });

    await this.portfolioPnl.syncUserNavPnL(params.userId);
    const balances = await this.ledgerService.getBalances(params.userId);
    const reason = params.closeReason ?? 'manual';
    const titleByReason: Record<typeof reason, string> = {
      manual: 'Đóng vị thế futures',
      take_profit: 'Take profit đã kích hoạt',
      stop_loss: 'Stop loss đã kích hoạt',
    };
    await this.notifications.notify({
      userId: params.userId,
      type: NotificationType.FUTURES_CLOSED,
      priority:
        reason === 'stop_loss'
          ? NotificationPriority.high
          : NotificationPriority.normal,
      title: titleByReason[reason],
      body: `${sym}: hoàn ${marginPortion.toFixed(2)} KC margin + PnL ${uPnl >= 0 ? '+' : ''}${uPnl.toFixed(2)} KC (về ví ${returnKc.toFixed(2)} KC)`,
      dedupeKey: `FUTURES_CLOSED:${position.id}:${closeSize}:${reason}`,
      payload: {
        deeplink: futuresDeeplink(
          token?.symbol,
          token?.name,
          position.tokenId,
        ),
        positionId: position.id,
        tokenId: position.tokenId,
        symbol: sym,
        pnlKc: uPnl,
        marginReturnedKc: marginPortion,
        grossReturnKc: grossReturn,
        closeFeeKc: closeFee,
        returnKc,
      },
    });
    this.notifications.clearMarginWarning(position.id);
    return {
      realizedPnlKc: uPnl,
      marginReturnedKc: marginPortion,
      grossReturnKc: grossReturn,
      closeFeeKc: closeFee,
      returnKc,
      markPrice: mark,
      balances,
    };
  }

  async liquidatePosition(positionId: string): Promise<boolean> {
    const position = await this.prisma.futuresPosition.findUnique({
      where: { id: positionId },
    });
    if (!position || position.status !== FuturesPositionStatus.open) {
      return false;
    }

    const quoteId = await this.userRepository.getQuoteTokenId();
    if (!quoteId) return false;

    const mark = await this.markPrice.getMarkPrice(position.tokenId);
    const cfg = await this.configService.getForToken(position.tokenId);
    const uPnl = unrealizedPnlKc(
      position.side,
      position.size,
      position.entryPrice,
      mark,
    );
    const closeSize = position.size;
    const marginPortion = resolveMarginPortionKc({
      storedMarginKc: position.marginKc,
      closeSize,
      positionSize: position.size,
      leverage: position.leverage,
      entryPrice: position.entryPrice,
    });
    const notional = closeSize * mark;
    const fee = notional * cfg.liquidationFeeRate;
    const returnKc = Math.max(
      0,
      closeReturnKc(marginPortion, uPnl) - fee,
    );

    await this.userRepository.adjustQuoteKcByUserId(position.userId, returnKc);

    await this.prisma.futuresPosition.update({
      where: { id: position.id },
      data: {
        size: 0,
        marginKc: 0,
        realizedPnlKc: position.realizedPnlKc + uPnl - fee,
        closedSize: closeSize,
        exitPrice: mark,
        status: FuturesPositionStatus.liquidated,
        liquidatedAt: new Date(),
        closedAt: new Date(),
      },
    });

    await this.prisma.futuresOrder.create({
      data: {
        userId: position.userId,
        positionId: position.id,
        tokenId: position.tokenId,
        side: position.side,
        type: FuturesOrderType.close_market,
        status: FuturesOrderStatus.filled,
        size: closeSize,
        filledPrice: mark,
        filledAt: new Date(),
      },
    });

    await this.ledgerService.append({
      userId: position.userId,
      amount: returnKc,
      currency: 'KC',
      tokenId: quoteId,
      refType: 'futures_liquidation',
      refId: position.id,
      note: 'Thanh lý futures',
    });

    await this.portfolioPnl.syncUserNavPnL(position.userId);

    const token = await this.tokenCryptoService.findOne(position.tokenId);
    const sym = token?.symbol ?? token?.name ?? 'token';
    await this.notifications.notify({
      userId: position.userId,
      type: NotificationType.FUTURES_LIQUIDATED,
      priority: NotificationPriority.critical,
      title: 'Vị thế bị thanh lý',
      body: `${sym} ${position.side} đã bị thanh lý tại ${mark.toFixed(4)} KC`,
      dedupeKey: `FUTURES_LIQUIDATED:${position.id}`,
      payload: {
        deeplink: futuresDeeplink(
          token?.symbol,
          token?.name,
          position.tokenId,
        ),
        positionId: position.id,
        tokenId: position.tokenId,
        symbol: sym,
        markPrice: mark,
        returnKc,
      },
    });
    this.notifications.clearMarginWarning(position.id);
    return true;
  }

  async checkLiquidations(): Promise<number> {
    const open = await this.prisma.futuresPosition.findMany({
      where: { status: FuturesPositionStatus.open },
    });
    let count = 0;
    for (const p of open) {
      try {
        const mark = await this.markPrice.getMarkPrice(p.tokenId);
        const cfg = await this.configService.getForToken(p.tokenId);
        const uPnl = unrealizedPnlKc(p.side, p.size, p.entryPrice, mark);
        const ratio = marginRatio(p.marginKc, uPnl, p.size, mark);
        const warnThreshold = cfg.maintenanceRate * 3;
        if (
          ratio <= warnThreshold &&
          ratio > cfg.maintenanceRate &&
          this.notifications.shouldEmitMarginWarning(p.id)
        ) {
          const token = await this.tokenCryptoService.findOne(p.tokenId);
          const sym = token?.symbol ?? token?.name ?? 'token';
          await this.notifications.notify({
            userId: p.userId,
            type: NotificationType.FUTURES_MARGIN_WARNING,
            priority: NotificationPriority.high,
            title: 'Cảnh báo margin',
            body: `${sym}: margin ratio ${(ratio * 100).toFixed(2)}% — gần ngưỡng thanh lý`,
            dedupeKey: `FUTURES_MARGIN_WARN:${p.id}`,
            payload: {
              deeplink: futuresDeeplink(
                token?.symbol,
                token?.name,
                p.tokenId,
              ),
              positionId: p.id,
              tokenId: p.tokenId,
              symbol: sym,
              marginRatio: ratio,
            },
          });
        }
        if (ratio <= cfg.maintenanceRate) {
          const ok = await this.liquidatePosition(p.id);
          if (ok) count += 1;
        }
      } catch {
        /* skip token without mark */
      }
    }
    return count;
  }

  async checkTpSlTriggers(): Promise<number> {
    const open = await this.prisma.futuresPosition.findMany({
      where: {
        status: FuturesPositionStatus.open,
        OR: [
          { takeProfitPrice: { not: null } },
          { stopLossPrice: { not: null } },
        ],
      },
    });
    let closed = 0;
    for (const p of open) {
      try {
        const mark = await this.markPrice.getMarkPrice(p.tokenId);
        const hit = await this.checkTpSlForPosition(p, mark);
        if (hit) closed += 1;
      } catch {
        /* skip */
      }
    }
    return closed;
  }

  private async checkTpSlForPosition(
    p: Prisma.FuturesPositionGetPayload<object>,
    mark: number,
  ): Promise<boolean> {
    if (p.status !== FuturesPositionStatus.open) return false;

    let trigger: 'tp' | 'sl' | null = null;
    if (
      p.takeProfitPrice != null &&
      p.takeProfitPrice > 0 &&
      isTakeProfitHit(p.side, mark, p.takeProfitPrice)
    ) {
      trigger = 'tp';
    } else if (
      p.stopLossPrice != null &&
      p.stopLossPrice > 0 &&
      isStopLossHit(p.side, mark, p.stopLossPrice)
    ) {
      trigger = 'sl';
    }
    if (!trigger) return false;

    await this.closeMarket({
      userId: p.userId,
      positionId: p.id,
      closeSize: null,
      closeReason: trigger === 'tp' ? 'take_profit' : 'stop_loss',
    });
    return true;
  }

  private async toPositionView(
    p: Prisma.FuturesPositionGetPayload<object>,
  ): Promise<PositionView> {
    const token = await this.tokenCryptoService.findOne(p.tokenId);
    const mark = await this.markPrice.getMarkPrice(p.tokenId);
    const cfg = await this.configService.getForToken(p.tokenId);
    const uPnl = unrealizedPnlKc(p.side, p.size, p.entryPrice, mark);
    const ratio = marginRatio(p.marginKc, uPnl, p.size, mark);
    return {
      id: p.id,
      tokenId: p.tokenId,
      symbol: token?.symbol ?? null,
      side: p.side,
      size: p.size,
      entryPrice: p.entryPrice,
      leverage: p.leverage,
      marginKc: p.marginKc,
      markPrice: mark,
      unrealizedPnlKc: uPnl,
      marginRatio: ratio,
      liquidationPrice: estimateLiqPrice(
        p.side,
        p.entryPrice,
        p.leverage,
        cfg.maintenanceRate,
      ),
      takeProfitPrice: p.takeProfitPrice ?? null,
      stopLossPrice: p.stopLossPrice ?? null,
      status: p.status,
      openedAt: p.openedAt,
    };
  }
}
