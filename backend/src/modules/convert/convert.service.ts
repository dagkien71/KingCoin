import { NotificationService } from '@modules/notification/notification.service';
import { PortfolioPnlService } from '@modules/user/portfolio-pnl.service';
import { UserRepository } from '@modules/user/user.repository';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { LedgerService } from '@modules/ledger/ledger.service';
import { TradingFeeService } from '@modules/fees/trading-fee.service';
import {
  NotificationPriority,
  NotificationType,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ConvertService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly portfolioPnl: PortfolioPnlService,
    private readonly tokenCryptoService: TokenCryptoService,
    private readonly ledgerService: LedgerService,
    private readonly tradingFees: TradingFeeService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Đổi token A → token B theo giá spot (KC là đơn vị quy chiếu).
   * amount = số lượng token nguồn (from) user bán.
   */
  async swap(params: {
    userId: string;
    fromTokenId: string;
    toTokenId: string;
    amount: number;
  }) {
    const { userId, fromTokenId, toTokenId, amount } = params;

    if (!fromTokenId || !toTokenId) {
      throw new BadRequestException('Chọn token nguồn và token đích.');
    }
    if (fromTokenId === toTokenId) {
      throw new BadRequestException('Hai token phải khác nhau.');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Số lượng không hợp lệ.');
    }

    const fromToken = await this.tokenCryptoService.findOne(fromTokenId);
    const toToken = await this.tokenCryptoService.findOne(toTokenId);

    if (!fromToken?.price || fromToken.price <= 0) {
      throw new NotFoundException(
        'Token nguồn không tồn tại hoặc chưa có giá.',
      );
    }
    if (!toToken?.price || toToken.price <= 0) {
      throw new NotFoundException(
        'Token đích không tồn tại hoặc chưa có giá.',
      );
    }

    const quoteId = await this.userRepository.getQuoteTokenId();

    const kcValue = amount * fromToken.price;
    const feeKc = this.tradingFees.convertFee(kcValue);
    const kcAfterFee = Math.max(0, kcValue - feeKc);
    const amountOut = kcAfterFee / toToken.price;

    if (!Number.isFinite(amountOut) || amountOut <= 0) {
      throw new BadRequestException('Không tính được số lượng nhận.');
    }

    const fromBal = await this.getBalance(userId, fromTokenId, quoteId);
    if (fromBal < amount - 1e-9) {
      const sym = fromToken.symbol ?? fromToken.name ?? 'token';
      throw new BadRequestException(
        `Không đủ ${sym}. Cần ${amount}, có ${fromBal.toFixed(6)}.`,
      );
    }

    await this.adjustBalance(userId, fromTokenId, quoteId, -amount);
    await this.adjustBalance(userId, toTokenId, quoteId, amountOut);

    const fromSym = fromToken.symbol ?? fromToken.name ?? 'token';
    const toSym = toToken.symbol ?? toToken.name ?? 'token';

    await this.ledgerService.append({
      userId,
      amount: -amount,
      currency: fromTokenId === quoteId ? 'KC' : 'TOKEN',
      tokenId: fromTokenId,
      refType: 'convert',
      refId: toTokenId,
      note: `Đổi ${fromSym} → ${toSym}`,
    });
    await this.ledgerService.append({
      userId,
      amount: amountOut,
      currency: toTokenId === quoteId ? 'KC' : 'TOKEN',
      tokenId: toTokenId,
      refType: 'convert',
      refId: fromTokenId,
      note: `Nhận ${toSym} (từ ${fromSym})`,
    });

    await this.portfolioPnl.syncUserNavPnL(userId);

    const balances = await this.ledgerService.getBalances(userId);
    await this.notifications.notify({
      userId,
      type: NotificationType.CONVERT_SUCCESS,
      priority: NotificationPriority.normal,
      title: 'Chuyển đổi thành công',
      body: `Đổi ${amount} ${fromSym} → ${amountOut.toFixed(6)} ${toSym}${feeKc > 0 ? ` (phí ~${feeKc.toFixed(4)} KC)` : ''}`,
      dedupeKey: `CONVERT:${userId}:${Date.now()}`,
      payload: {
        deeplink: '/convert',
        fromTokenId,
        toTokenId,
        fromSymbol: fromSym,
        toSymbol: toSym,
        amountIn: amount,
        amountOut,
      },
    });
    return {
      balances,
      amountIn: amount,
      amountOut,
      feeKc,
      kcValue,
      fromTokenId,
      toTokenId,
      fromSymbol: fromSym,
      toSymbol: toSym,
    };
  }

  private async getBalance(
    userId: string,
    tokenId: string,
    quoteId: string | null,
  ): Promise<number> {
    if (quoteId && tokenId === quoteId) {
      return this.userRepository.getQuoteBalance(userId);
    }
    return this.userRepository.getTokenBalance(userId, tokenId);
  }

  private async adjustBalance(
    userId: string,
    tokenId: string,
    quoteId: string | null,
    delta: number,
  ): Promise<void> {
    if (quoteId && tokenId === quoteId) {
      await this.userRepository.adjustBalanceTokenByUserId(
        userId,
        quoteId,
        delta,
      );
      return;
    }
    await this.userRepository.adjustBaseTokenByUserId(userId, tokenId, delta);
  }
}
