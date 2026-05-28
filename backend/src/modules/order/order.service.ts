import { isLiquidityBotEmail } from '../../common/system-accounts.util';
import {
  dedicatedKindFromEmail,
  isDedicatedBotEmail,
} from '@modules/market-maker/token-dedicated-bots.util';
import { mmLiquidityEmails } from '@modules/market-maker/liquidity-bots.util';
import { assertPositiveSpotPrice } from '../../common/spot-price.util';
import { NotificationService } from '@modules/notification/notification.service';
import { tradeDeeplink } from '../../common/token-route.util';
import { LedgerService } from '@modules/ledger/ledger.service';
import { TradingFeeService } from '@modules/fees/trading-fee.service';
import { RealtimeService } from '@modules/realtime/realtime.service';
import { TokenCryptoLogService } from '@modules/token-crypto/token-log.service';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { PortfolioPnlService } from '@modules/user/portfolio-pnl.service';
import { UserRepository } from '@modules/user/user.repository';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import {
  NotificationPriority,
  NotificationType,
  Order,
  OrderStatus,
  Prisma,
  TokenCrypto,
  TradeFill,
} from '@prisma/client';
import type { MmInstantFillService } from '@modules/market-maker/mm-instant-fill.service';
import { OrderRepository } from './order.repository';
import { TradeFillRepository } from './trade-fill.repository';

type PendingOrder = Order & { quantity: number; matchedQuantity: number };

function mapApiStatus(
  status?: 'pending' | 'complete' | 'cancel',
): OrderStatus | undefined {
  if (!status) return undefined;
  if (status === 'complete') return OrderStatus.completed;
  if (status === 'cancel') return OrderStatus.canceled;
  return OrderStatus.pending;
}

/**
 * Trả về true chỉ khi email là bot **MM maker** (đặt lệnh limit, không taker).
 * Flow bots (taker) cần được phép khớp với MM bots để tạo ra giao dịch & thay đổi giá.
 */
function isMmMakerBotEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (isDedicatedBotEmail(normalized)) {
    return dedicatedKindFromEmail(normalized) === 'mm';
  }
  return mmLiquidityEmails().some((e) => e.toLowerCase() === normalized);
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly tradeFillRepository: TradeFillRepository,
    private readonly userRepository: UserRepository,
    private readonly portfolioPnl: PortfolioPnlService,
    private readonly tokenCryptoLogService: TokenCryptoLogService,
    private readonly tokenCryptoService: TokenCryptoService,
    private readonly realtimeService: RealtimeService,
    private readonly ledgerService: LedgerService,
    private readonly tradingFees: TradingFeeService,
    private readonly notificationService: NotificationService,
    @Inject(
      forwardRef(
        () =>
          require('../market-maker/mm-instant-fill.service')
            .MmInstantFillService,
      ),
    )
    private readonly mmInstantFill: MmInstantFillService,
  ) {}

  /** Cộng/trừ KC ví Spot (stableCoin + BalanceToken quote). */
  private async adjustSpotQuoteKc(userId: string, delta: number): Promise<void> {
    const quoteId = await this.userRepository.getQuoteTokenId();
    if (!quoteId) {
      await this.userRepository.adjustStableCoinByUserId(userId, delta);
      return;
    }
    await this.userRepository.adjustQuoteKcByUserId(userId, delta);
  }

  /** Trừ KC/base khi treo lệnh — chuẩn escrow sàn spot */
  private async reserveOrderFunds(
    userId: string,
    type: 'buy' | 'sell',
    tokenId: string,
    price: number,
    quantity: number,
    orderId: string,
  ): Promise<void> {
    const quoteId = await this.userRepository.getQuoteTokenId();

    if (type === 'buy') {
      const cost = price * quantity;
      await this.adjustSpotQuoteKc(userId, -cost);
      await this.ledgerService.append({
        userId,
        amount: -cost,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType: 'order_reserve',
        refId: orderId,
        note: 'Treo lệnh mua',
      });
      return;
    }

    if (quoteId && tokenId === quoteId) {
      await this.userRepository.adjustBalanceTokenByUserId(
        userId,
        quoteId,
        -quantity,
      );
      await this.ledgerService.append({
        userId,
        amount: -quantity,
        currency: 'KC',
        tokenId: quoteId,
        refType: 'order_reserve',
        refId: orderId,
        note: 'Treo lệnh bán KC',
      });
      return;
    }

    await this.userRepository.adjustBaseTokenByUserId(userId, tokenId, -quantity);
    await this.ledgerService.append({
      userId,
      amount: -quantity,
      currency: 'TOKEN',
      tokenId,
      refType: 'order_reserve',
      refId: orderId,
      note: 'Treo lệnh bán',
    });
  }

  /** Số KC hoặc base đang khoá cho phần quantity còn lại */
  private lockedAmount(order: Order): number {
    const qty = Number(order.quantity);
    if (order.type === 'buy') {
      return Number(order.price) * qty;
    }
    return qty;
  }

  /** Điều chỉnh escrow: delta > 0 trừ thêm, delta < 0 hoàn */
  private async adjustEscrowDelta(
    order: Order,
    delta: number,
    refType: 'order_amend',
    note: string,
  ): Promise<void> {
    if (Math.abs(delta) < 1e-12) return;

    const quoteId = await this.userRepository.getQuoteTokenId();
    const userId = order.userId;
    const orderId = order.id;

    if (delta > 0) {
      if (order.type === 'buy') {
        const cost = delta;
        await this.adjustSpotQuoteKc(userId, -cost);
        await this.ledgerService.append({
          userId,
          amount: -cost,
          currency: 'KC',
          tokenId: quoteId ?? undefined,
          refType,
          refId: orderId,
          note,
        });
        return;
      }
      if (quoteId && order.tokenId === quoteId) {
        await this.userRepository.adjustBalanceTokenByUserId(
          userId,
          quoteId,
          -delta,
        );
        await this.ledgerService.append({
          userId,
          amount: -delta,
          currency: 'KC',
          tokenId: quoteId,
          refType,
          refId: orderId,
          note,
        });
        return;
      }
      await this.userRepository.adjustBaseTokenByUserId(
        userId,
        order.tokenId,
        -delta,
      );
      await this.ledgerService.append({
        userId,
        amount: -delta,
        currency: 'TOKEN',
        tokenId: order.tokenId,
        refType,
        refId: orderId,
        note,
      });
      return;
    }

    const refund = -delta;
    if (order.type === 'buy') {
      await this.adjustSpotQuoteKc(userId, refund);
      await this.ledgerService.append({
        userId,
        amount: refund,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType,
        refId: orderId,
        note,
      });
      return;
    }
    if (quoteId && order.tokenId === quoteId) {
      await this.userRepository.adjustBalanceTokenByUserId(
        userId,
        quoteId,
        refund,
      );
      await this.ledgerService.append({
        userId,
        amount: refund,
        currency: 'KC',
        tokenId: quoteId,
        refType,
        refId: orderId,
        note,
      });
      return;
    }
    await this.userRepository.adjustBaseTokenByUserId(
      userId,
      order.tokenId,
      refund,
    );
    await this.ledgerService.append({
      userId,
      amount: refund,
      currency: 'TOKEN',
      tokenId: order.tokenId,
      refType,
      refId: orderId,
      note,
    });
  }

  /** Hoàn phần chưa khớp khi hủy lệnh */
  private async releaseOrderFunds(order: Order): Promise<void> {
    const remaining = Number(order.quantity);
    if (remaining <= 1e-12) return;

    const quoteId = await this.userRepository.getQuoteTokenId();
    const price = Number(order.price);

    if (order.type === 'buy') {
      const refund = price * remaining;
      await this.adjustSpotQuoteKc(order.userId, refund);
      await this.ledgerService.append({
        userId: order.userId,
        amount: refund,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType: 'order_cancel',
        refId: order.id,
        note: 'Hủy lệnh mua — hoàn KC',
      });
      return;
    }

    if (quoteId && order.tokenId === quoteId) {
      await this.userRepository.adjustBalanceTokenByUserId(
        order.userId,
        quoteId,
        remaining,
      );
      await this.ledgerService.append({
        userId: order.userId,
        amount: remaining,
        currency: 'KC',
        tokenId: quoteId,
        refType: 'order_cancel',
        refId: order.id,
        note: 'Hủy lệnh bán — hoàn KC',
      });
      return;
    }

    await this.userRepository.adjustBaseTokenByUserId(
      order.userId,
      order.tokenId,
      remaining,
    );
    await this.ledgerService.append({
      userId: order.userId,
      amount: remaining,
      currency: 'TOKEN',
      tokenId: order.tokenId,
      refType: 'order_cancel',
      refId: order.id,
      note: 'Hủy lệnh bán — hoàn token',
    });
  }

  async findById(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return order;
  }

  async findOne(params: Prisma.OrderFindFirstArgs): Promise<Order | null> {
    return this.orderRepository.findOne(params);
  }

  async findAll(params: {
    userId?: string;
    tokenId?: string;
    type?: 'buy' | 'sell';
    status?: 'pending' | 'complete' | 'cancel';
    orderBy?: Prisma.OrderOrderByWithRelationInput;
  }): Promise<PaginatorTypes.PaginatedResult<Order>> {
    const { userId, tokenId, type, status, orderBy } = params;
    const where: Prisma.OrderWhereInput = {};

    if (userId) where.userId = userId;
    if (tokenId) where.tokenId = tokenId;
    if (type) where.type = type;
    const mapped = mapApiStatus(status);
    if (mapped) where.status = mapped;

    return this.orderRepository.findAll(where, orderBy);
  }

  async findFills(params: {
    tokenId?: string;
    userId?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaginatorTypes.PaginatedResult<TradeFill>> {
    const { tokenId, userId } = params;
    const where: Prisma.TradeFillWhereInput = {};
    if (tokenId) where.tokenId = tokenId;
    if (userId) {
      where.OR = [{ buyerId: userId }, { sellerId: userId }];
    }
    return this.tradeFillRepository.findAll(where);
  }

  async findRecentFills(tokenId: string, limit = 50): Promise<TradeFill[]> {
    return this.tradeFillRepository.findMany({ tokenId }, limit);
  }

  /**
   * Top N mức giá pending mỗi bên — chỉ price/qty (UI sổ lệnh, không trả full Order).
   * Dùng findPending* (cùng query market-price) rồi sort/slice in-memory — tránh P2023
   * khi Prisma filter/select gặp document Mongo lệch kiểu.
   */
  async getOrderbookDepth(
    tokenId: string,
    levels = 10,
  ): Promise<{
    tokenId: string;
    at: number;
    bids: { price: number; quantity: number }[];
    asks: { price: number; quantity: number }[];
  }> {
    const cap = Math.min(50, Math.max(1, Math.floor(levels)));

    const [buys, sells] = await Promise.all([
      this.orderRepository.findPendingOrdersForBook(tokenId, 'buy'),
      this.orderRepository.findPendingOrdersForBook(tokenId, 'sell'),
    ]);

    const toLevel = (
      o: Order,
    ): { price: number; quantity: number } | null => {
      const price = Number(o.price);
      const remaining =
        Number(o.quantity) - Number(o.matchedQuantity ?? 0);
      if (
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isFinite(remaining) ||
        remaining <= 1e-12
      ) {
        return null;
      }
      return { price, quantity: remaining };
    };

    const bids = buys
      .map(toLevel)
      .filter((r): r is { price: number; quantity: number } => r != null)
      .sort((a, b) => b.price - a.price)
      .slice(0, cap);

    const asks = sells
      .map(toLevel)
      .filter((r): r is { price: number; quantity: number } => r != null)
      .sort((a, b) => a.price - b.price)
      .slice(0, cap);

    return {
      tokenId,
      at: Date.now(),
      bids,
      asks,
    };
  }

  /**
   * Giá thị trường cho lệnh market: mua = best ask, bán = best bid, không có thì last.
   */
  async getMarketPrice(
    tokenId: string,
    side: 'buy' | 'sell',
  ): Promise<{ price: number; source: 'book' | 'last' }> {
    if (side === 'buy') {
      const sells = await this.orderRepository.findPendingSellOrders(tokenId);
      if (sells.length > 0) {
        return { price: Number(sells[0].price), source: 'book' };
      }
    } else {
      const buys = await this.orderRepository.findPendingBuyOrders(tokenId);
      if (buys.length > 0) {
        return { price: Number(buys[0].price), source: 'book' };
      }
    }
    const token = await this.tokenCryptoService.findOne(tokenId);
    const last = Number(token?.price ?? 0);
    if (last <= 0) {
      throw new BadRequestException(
        'Chưa có giá thị trường — thử lại sau khi có sổ lệnh hoặc khớp lệnh.',
      );
    }
    return { price: last, source: 'last' };
  }

  private async validateOrderBalance(
    userId: string,
    type: 'buy' | 'sell',
    tokenId: string,
    price: number,
    quantity: number,
  ): Promise<void> {
    const quoteId = await this.userRepository.getQuoteTokenId();
    const cost = price * quantity;
    const takerFee = this.tradingFees.spotFee(cost, false);

    if (type === 'buy') {
      const kc = await this.userRepository.getQuoteBalance(userId);
      if (kc < cost + takerFee - 1e-9) {
        throw new BadRequestException(
          `Không đủ KingCoin (KC). Cần ${(cost + takerFee).toFixed(4)} KC (gồm phí tối đa), hiện có ${kc.toFixed(4)} KC.`,
        );
      }
      return;
    }

    if (quoteId && tokenId === quoteId) {
      const kc = await this.userRepository.getQuoteBalance(userId);
      if (kc < quantity - 1e-9) {
        throw new BadRequestException(
          `Không đủ KC để bán. Cần ${quantity}, hiện có ${kc.toFixed(4)}.`,
        );
      }
      return;
    }

    const base = await this.userRepository.getTokenBalance(userId, tokenId);
    if (base < quantity - 1e-9) {
      throw new BadRequestException(
        `Không đủ token để bán. Cần ${quantity}, hiện có ${base.toFixed(8)}.`,
      );
    }
  }

  async create(
    data: Prisma.OrderCreateInput,
    opts?: { deferMatch?: boolean },
  ): Promise<Order> {
    const userId =
      typeof data.user === 'object' &&
      data.user !== null &&
      'connect' in data.user &&
      data.user.connect &&
      typeof data.user.connect === 'object' &&
      'id' in data.user.connect
        ? String(data.user.connect.id)
        : null;

    if (!userId || !data.tokenId || data.price == null || data.quantity == null) {
      throw new BadRequestException('Thiếu thông tin lệnh.');
    }

    const type = data.type as 'buy' | 'sell';
    const price = assertPositiveSpotPrice(Number(data.price), 'Giá lệnh');
    const quantity = Number(data.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('Khối lượng lệnh phải dương.');
    }

    await this.validateOrderBalance(
      userId,
      type,
      String(data.tokenId),
      price,
      quantity,
    );

    const order = await this.orderRepository.create(data);
    await this.reserveOrderFunds(
      userId,
      type,
      String(data.tokenId),
      price,
      quantity,
      order.id,
    );
    if (!opts?.deferMatch) {
      await this.matchOrders(order.tokenId);

      const afterBook = (await this.orderRepository.findById(order.id)) ?? order;
      if (
        afterBook.status === OrderStatus.pending &&
        Number(afterBook.quantity) > 0
      ) {
        await this.mmInstantFill.tryFillUserOrderAtMarket(userId, afterBook);
      }
    }

    const finalOrder =
      (await this.orderRepository.findById(order.id)) ?? order;
    if (!opts?.deferMatch) {
      const token = await this.tokenCryptoService.findOne(finalOrder.tokenId);
      await this.notifyPlacedOrder(userId, finalOrder, token);
      await this.notifyAdminsOrderPlaced(userId, finalOrder, token);
    }
    return finalOrder;
  }

  async matchOrders(tokenId: string): Promise<void> {
    const pendingBuyOrders = (
      await this.orderRepository.findPendingBuyOrders(tokenId)
    ).map((o) => ({ ...o })) as PendingOrder[];

    const pendingSellOrders = (
      await this.orderRepository.findPendingSellOrders(tokenId)
    ).map((o) => ({ ...o })) as PendingOrder[];

    // Prevent MM maker bot-vs-MM maker bot matching which drains the book.
    // Flow bots (taker kind) are intentionally allowed to match against MM maker bots
    // so that trade fills happen and price can move.
    const userIds = [
      ...new Set(
        [...pendingBuyOrders, ...pendingSellOrders].map((o) => String(o.userId)),
      ),
    ];
    const mmMakerBotUserIds = new Set<string>();
    if (userIds.length > 0) {
      const users = await this.userRepository.findMany(
        { id: { in: userIds } },
        { createdAt: 'desc' },
      );
      for (const u of users) {
        if (isMmMakerBotEmail(u.email)) {
          mmMakerBotUserIds.add(String(u.id));
        }
      }
    }

    pendingBuyOrders.sort(
      (a, b) => b.price - a.price || Number(a.createdAt) - Number(b.createdAt),
    );
    pendingSellOrders.sort(
      (a, b) => a.price - b.price || Number(a.createdAt) - Number(b.createdAt),
    );

    let buyIndex = 0;
    let sellIndex = 0;
    const token = await this.tokenCryptoService.findOne(tokenId);

    while (
      buyIndex < pendingBuyOrders.length &&
      sellIndex < pendingSellOrders.length
    ) {
      const buyOrder = pendingBuyOrders[buyIndex];
      const sellOrder = pendingSellOrders[sellIndex];

      if (buyOrder.userId === sellOrder.userId) {
        sellIndex++;
        continue;
      }

      if (
        mmMakerBotUserIds.has(String(buyOrder.userId)) &&
        mmMakerBotUserIds.has(String(sellOrder.userId))
      ) {
        // Skip matching two MM maker bots (same side liquidity providers).
        // Flow taker bots are NOT in mmMakerBotUserIds and will match normally.
        const buyTs = Number(buyOrder.createdAt) || 0;
        const sellTs = Number(sellOrder.createdAt) || 0;
        if (sellTs >= buyTs) sellIndex++;
        else buyIndex++;
        continue;
      }

      if (buyOrder.price < sellOrder.price) {
        break;
      }

        const tradeQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
      const matchPrice = Number(sellOrder.price);
      if (!Number.isFinite(matchPrice) || matchPrice <= 0) {
        sellIndex++;
        continue;
      }

      const buyRemaining = buyOrder.quantity - tradeQuantity;
      const sellRemaining = sellOrder.quantity - tradeQuantity;
      const buyMatched = buyOrder.matchedQuantity + tradeQuantity;
      const sellMatched = sellOrder.matchedQuantity + tradeQuantity;

        await this.orderRepository.updateOrderStatusAndQuantity(
          buyOrder.id,
        buyRemaining <= 0 ? OrderStatus.completed : OrderStatus.pending,
        buyRemaining,
        buyMatched,
      );

        await this.orderRepository.updateOrderStatusAndQuantity(
          sellOrder.id,
        sellRemaining <= 0 ? OrderStatus.completed : OrderStatus.pending,
        sellRemaining,
        sellMatched,
      );

      const fill = await this.tradeFillRepository.create({
        tokenId,
        buyOrderId: buyOrder.id,
        sellOrderId: sellOrder.id,
        buyerId: buyOrder.userId,
        sellerId: sellOrder.userId,
        price: matchPrice,
        quantity: tradeQuantity,
      });

      this.realtimeService.broadcastTrade(tokenId, {
        id: fill.id,
        tokenId,
        price: matchPrice,
        quantity: tradeQuantity,
        createdAt: fill.createdAt,
        buyerId: buyOrder.userId,
        sellerId: sellOrder.userId,
      });

      await this.settleTrade(
          buyOrder.userId,
          sellOrder.userId,
        tokenId,
        matchPrice,
          tradeQuantity,
        fill.id,
        Number(buyOrder.createdAt) <= Number(sellOrder.createdAt),
      );

      await this.notifyFillForUser(
        buyOrder.userId,
        buyOrder,
        buyRemaining,
        token,
        fill.id,
        tradeQuantity,
        matchPrice,
      );
      await this.notifyFillForUser(
        sellOrder.userId,
        sellOrder,
        sellRemaining,
        token,
        fill.id,
        tradeQuantity,
        matchPrice,
      );

      void this.tokenCryptoService
        .updatePrice(tokenId, matchPrice, {
          writeLog: true,
          logVolume: matchPrice * tradeQuantity,
        })
        .catch((err) => console.error('TokenCrypto price after match:', err));

      buyOrder.quantity = buyRemaining;
      buyOrder.matchedQuantity = buyMatched;
      sellOrder.quantity = sellRemaining;
      sellOrder.matchedQuantity = sellMatched;

      if (buyRemaining <= 0) buyIndex++;
      if (sellRemaining <= 0) sellIndex++;
    }
  }

  /**
   * Khớp lệnh: KC/base đã trừ lúc treo lệnh — chỉ chuyển phần đối ứng cho counterparty.
   */
  private async settleTrade(
    buyerId: string,
    sellerId: string,
    tradedTokenId: string,
    price: number,
    quantity: number,
    fillId: string,
    buyerIsMaker: boolean,
  ): Promise<void> {
    const totalKc = price * quantity;
    const quoteId = await this.userRepository.getQuoteTokenId();
    const buyFee = this.tradingFees.spotFee(totalKc, buyerIsMaker);
    const sellFee = this.tradingFees.spotFee(totalKc, !buyerIsMaker);

    if (!quoteId) {
      await this.userRepository.adjustStableCoinByUserId(sellerId, totalKc);
      await this.ledgerService.append({
        userId: sellerId,
        amount: totalKc,
        currency: 'KC',
        refType: 'trade',
        refId: fillId,
        note: 'Khớp lệnh — nhận KC',
      });
      await this.applySpotTradeFees({
        buyerId,
        sellerId,
        quoteId: '',
        fillId,
        buyFee,
        sellFee,
        buyerIsMaker,
        legacyStablecoin: true,
      });
      return;
    }

    if (tradedTokenId === quoteId) {
      await this.userRepository.adjustBalanceTokenByUserId(
        buyerId,
        quoteId,
        quantity,
      );
      await this.userRepository.adjustBalanceTokenByUserId(
        sellerId,
        quoteId,
        totalKc,
      );
      await this.ledgerService.append({
        userId: buyerId,
        amount: quantity,
        currency: 'KC',
        tokenId: quoteId,
        refType: 'trade',
        refId: fillId,
        note: 'Khớp lệnh — nhận KC',
      });
      await this.ledgerService.append({
        userId: sellerId,
        amount: totalKc,
        currency: 'KC',
        tokenId: quoteId,
        refType: 'trade',
        refId: fillId,
        note: 'Khớp lệnh — nhận KC',
      });
      await this.applySpotTradeFees({
        buyerId,
        sellerId,
        quoteId,
        fillId,
        buyFee,
        sellFee,
        buyerIsMaker,
      });
      return;
    }

    await this.userRepository.adjustBaseTokenByUserId(
      buyerId,
      tradedTokenId,
      quantity,
    );
    await this.userRepository.adjustBalanceTokenByUserId(
      sellerId,
      quoteId,
      totalKc,
    );
    await this.ledgerService.append({
      userId: buyerId,
      amount: quantity,
      currency: 'TOKEN',
      tokenId: tradedTokenId,
      refType: 'trade',
      refId: fillId,
      note: 'Khớp lệnh — nhận token',
    });
    await this.ledgerService.append({
      userId: sellerId,
      amount: totalKc,
      currency: 'KC',
      tokenId: quoteId,
      refType: 'trade',
      refId: fillId,
      note: 'Khớp lệnh — nhận KC',
    });

    await this.applySpotTradeFees({
      buyerId,
      sellerId,
      quoteId,
      fillId,
      buyFee,
      sellFee,
      buyerIsMaker,
    });

    void this.portfolioPnl.syncUserNavPnL(buyerId).catch((e) =>
      this.logger.warn(`syncNavPnL buyer: ${(e as Error).message}`),
    );
    void this.portfolioPnl.syncUserNavPnL(sellerId).catch((e) =>
      this.logger.warn(`syncNavPnL seller: ${(e as Error).message}`),
    );
  }

  private async applySpotTradeFees(params: {
    buyerId: string;
    sellerId: string;
    quoteId: string;
    fillId: string;
    buyFee: number;
    sellFee: number;
    buyerIsMaker: boolean;
    legacyStablecoin?: boolean;
  }): Promise<void> {
    const {
      buyerId,
      sellerId,
      quoteId,
      fillId,
      buyFee,
      sellFee,
      buyerIsMaker,
      legacyStablecoin,
    } = params;

    const deductBuy = async (fee: number) => {
      if (fee <= 0) return;
      if (legacyStablecoin) {
        await this.userRepository.adjustStableCoinByUserId(buyerId, -fee);
        await this.ledgerService.append({
          userId: buyerId,
          amount: -fee,
          currency: 'KC',
          refType: buyerIsMaker ? 'trade_fee_maker' : 'trade_fee_taker',
          refId: fillId,
          note: buyerIsMaker ? 'Phí maker khớp lệnh' : 'Phí taker khớp lệnh',
        });
        return;
      }
      await this.tradingFees.collectKcFee({
        userId: buyerId,
        quoteId,
        feeKc: fee,
        refType: buyerIsMaker ? 'trade_fee_maker' : 'trade_fee_taker',
        refId: fillId,
        note: buyerIsMaker ? 'Phí maker khớp lệnh' : 'Phí taker khớp lệnh',
      });
    };

    const deductSell = async (fee: number) => {
      if (fee <= 0) return;
      if (legacyStablecoin) {
        await this.userRepository.adjustStableCoinByUserId(sellerId, -fee);
        await this.ledgerService.append({
          userId: sellerId,
          amount: -fee,
          currency: 'KC',
          refType: buyerIsMaker ? 'trade_fee_taker' : 'trade_fee_maker',
          refId: fillId,
          note: buyerIsMaker ? 'Phí taker khớp lệnh' : 'Phí maker khớp lệnh',
        });
        return;
      }
      await this.tradingFees.collectKcFee({
        userId: sellerId,
        quoteId,
        feeKc: fee,
        refType: buyerIsMaker ? 'trade_fee_taker' : 'trade_fee_maker',
        refId: fillId,
        note: buyerIsMaker ? 'Phí taker khớp lệnh' : 'Phí maker khớp lệnh',
      });
    };

    await deductBuy(buyFee);
    await deductSell(sellFee);
  }

  async update(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException('Chỉ chỉnh sửa lệnh đang chờ khớp.');
    }

    const newPrice =
      data.price != null ? Number(data.price) : Number(order.price);
    const newQty =
      data.quantity != null ? Number(data.quantity) : Number(order.quantity);
    if (newPrice <= 0 || newQty <= 0) {
      throw new BadRequestException('Giá và số lượng phải lớn hơn 0.');
    }

    const oldLock = this.lockedAmount(order);
    const newLock =
      order.type === 'buy' ? newPrice * newQty : newQty;
    const delta = newLock - oldLock;

    if (delta > 1e-9) {
      if (order.type === 'buy') {
        await this.validateOrderBalance(
          order.userId,
          'buy',
          order.tokenId,
          delta,
          1,
        );
      } else {
        await this.validateOrderBalance(
          order.userId,
          'sell',
          order.tokenId,
          newPrice,
          delta,
        );
      }
      await this.adjustEscrowDelta(
        order,
        delta,
        'order_amend',
        'Điều chỉnh lệnh — khoá thêm',
      );
    } else if (delta < -1e-9) {
      await this.adjustEscrowDelta(
        order,
        delta,
        'order_amend',
        'Điều chỉnh lệnh — hoàn phần dư',
      );
    }

    const updated = await this.orderRepository.update(id, {
      ...data,
      price: newPrice,
      quantity: newQty,
    });
    await this.matchOrders(order.tokenId);
    this.realtimeService.broadcastOrderbook(order.tokenId);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException(
        'Chỉ hủy được lệnh đang chờ khớp (hoặc phần còn lại sau khớp một phần).',
      );
    }

    await this.releaseOrderFunds(order);

    try {
    await this.orderRepository.delete(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(msg);
    }

    this.realtimeService.broadcastOrderbook(order.tokenId);

    const token = await this.tokenCryptoService.findOne(order.tokenId);
    const sym = token?.symbol ?? token?.name ?? 'Token';
    await this.notificationService.notify({
      userId: order.userId,
      type: NotificationType.ORDER_CANCELLED,
      priority: NotificationPriority.normal,
      title: 'Đã hủy lệnh',
      body: `Lệnh ${order.type === 'buy' ? 'mua' : 'bán'} ${sym} đã được hủy.`,
      dedupeKey: `ORDER_CANCELLED:${order.id}`,
      payload: {
        deeplink: '/trade/history',
        orderId: order.id,
        tokenId: order.tokenId,
        symbol: sym,
      },
    });
  }

  private async notifyAdminsOrderPlaced(
    userId: string,
    order: Order,
    token: TokenCrypto | null,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || isLiquidityBotEmail(user.email, user.username)) {
      return;
    }

    const sym = token?.symbol ?? token?.name ?? 'Token';
    const side = order.type === 'buy' ? 'Mua' : 'Bán';
    const price = Number(order.price);
    const qty = Number(order.quantity);
    const matched = Number(order.matchedQuantity) || 0;

    let statusNote = 'chờ khớp';
    if (order.status === OrderStatus.completed) {
      statusNote = 'đã khớp hết';
    } else if (matched > 0) {
      statusNote = `khớp một phần (${matched.toFixed(4)})`;
    }

    const who = user.username?.trim() || user.email;

    await this.notificationService.notifyAdmins({
      type: NotificationType.ADMIN_ORDER_PLACED,
      priority: NotificationPriority.normal,
      title: 'User đặt lệnh spot',
      body: `${who}: ${side} ${qty.toFixed(4)} ${sym} @ ${price.toFixed(4)} KC — ${statusNote}`,
      dedupeKey: `ADMIN_ORDER_PLACED:${order.id}`,
      payload: {
        deeplink: `/admin/users/${userId}?tab=orders`,
        orderId: order.id,
        tokenId: order.tokenId,
        symbol: sym,
        userId,
        userEmail: user.email,
        orderType: order.type,
        price,
        quantity: qty,
        status: order.status,
      },
    });
  }

  private async notifyPlacedOrder(
    userId: string,
    order: Order,
    token: TokenCrypto | null,
  ): Promise<void> {
    const sym = token?.symbol ?? token?.name ?? 'Token';
    const deeplink = tradeDeeplink(
      token?.symbol,
      token?.name,
      order.tokenId,
    );
    const matched = Number(order.matchedQuantity) || 0;
    const qty = Number(order.quantity) || 0;

    if (order.status === OrderStatus.completed) {
      await this.notificationService.notify({
        userId,
        type: NotificationType.ORDER_FILLED,
        priority: NotificationPriority.high,
        title: 'Lệnh đã khớp',
        body: `Lệnh ${order.type === 'buy' ? 'mua' : 'bán'} ${sym} đã khớp hoàn toàn.`,
        dedupeKey: `ORDER_FILLED:${order.id}:${userId}`,
        payload: {
          deeplink,
          orderId: order.id,
          tokenId: order.tokenId,
          symbol: sym,
        },
      });
      return;
    }

    if (matched > 0) {
      await this.notificationService.notify({
        userId,
        type: NotificationType.ORDER_PARTIAL_FILL,
        priority: NotificationPriority.high,
        title: 'Lệnh khớp một phần',
        body: `${sym}: đã khớp ${matched.toFixed(4)}, còn ${qty.toFixed(4)}.`,
        dedupeKey: `ORDER_PARTIAL:${order.id}:${userId}:${matched}`,
        payload: {
          deeplink,
          orderId: order.id,
          tokenId: order.tokenId,
          symbol: sym,
          matchedQuantity: matched,
        },
      });
      return;
    }

    if (order.status === OrderStatus.pending) {
      await this.notificationService.notify({
        userId,
        type: NotificationType.ORDER_PLACED,
        priority: NotificationPriority.normal,
        title: 'Lệnh đã đặt',
        body: `Lệnh ${order.type === 'buy' ? 'mua' : 'bán'} ${sym} đang chờ khớp.`,
        dedupeKey: `ORDER_PLACED:${order.id}`,
        payload: {
          deeplink,
          orderId: order.id,
          tokenId: order.tokenId,
          symbol: sym,
        },
      });
    }
  }

  private async notifyFillForUser(
    userId: string,
    order: PendingOrder,
    remainingQty: number,
    token: TokenCrypto | null,
    fillId: string,
    tradeQuantity: number,
    matchPrice: number,
  ): Promise<void> {
    const sym = token?.symbol ?? token?.name ?? 'Token';
    const deeplink = tradeDeeplink(
      token?.symbol,
      token?.name,
      order.tokenId,
    );
    const filled = remainingQty <= 1e-12;

    await this.notificationService.notify({
      userId,
      type: filled
        ? NotificationType.ORDER_FILLED
        : NotificationType.ORDER_PARTIAL_FILL,
      priority: NotificationPriority.high,
      title: filled ? 'Lệnh đã khớp' : 'Lệnh khớp một phần',
      body: filled
        ? `${sym}: khớp ${tradeQuantity.toFixed(4)} @ ${matchPrice.toFixed(4)} KC`
        : `${sym}: khớp ${tradeQuantity.toFixed(4)}, còn ${remainingQty.toFixed(4)}`,
      dedupeKey: `ORDER_FILL:${fillId}:${userId}`,
      payload: {
        deeplink,
        orderId: order.id,
        tokenId: order.tokenId,
        symbol: sym,
        fillId,
        price: matchPrice,
        quantity: tradeQuantity,
      },
    });
  }
}
