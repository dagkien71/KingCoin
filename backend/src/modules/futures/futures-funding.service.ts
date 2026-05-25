import { TradingFeeService } from '@modules/fees/trading-fee.service';
import { MarkPriceService } from '@modules/futures/mark-price.service';
import { UserRepository } from '@modules/user/user.repository';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FuturesPositionStatus, FuturesSide, WalletPool } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { TRADING_FEES } from '../../common/trading-fees.config';

/** Funding: long trả KC, short nhận KC — mỗi 8 giờ. */
@Injectable()
export class FuturesFundingService {
  private readonly logger = new Logger(FuturesFundingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly markPrice: MarkPriceService,
    private readonly userRepository: UserRepository,
    private readonly tradingFees: TradingFeeService,
  ) {}

  @Cron('0 0 */8 * * *')
  async applyFunding(): Promise<void> {
    if (TRADING_FEES.futuresFundingRate <= 0) return;

    const quoteId = await this.userRepository.getQuoteTokenId();
    if (!quoteId) return;

    const positions = await this.prisma.futuresPosition.findMany({
      where: { status: FuturesPositionStatus.open },
    });
    if (positions.length === 0) return;

    let applied = 0;
    for (const pos of positions) {
      try {
        const mark = await this.markPrice.getMarkPrice(pos.tokenId);
        const notional = pos.size * mark;
        const payment = this.tradingFees.futuresFundingPayment(notional);
        if (payment <= 1e-12) continue;

        const batchId = `funding:${Date.now()}`;
        if (pos.side === FuturesSide.long) {
          const kc = await this.userRepository.getWalletKc(
            pos.userId,
            WalletPool.funding,
          );
          const charge = Math.min(kc, payment);
          if (charge <= 1e-12) continue;
          await this.tradingFees.collectKcFee({
            userId: pos.userId,
            quoteId,
            feeKc: charge,
            refType: 'futures_funding',
            refId: pos.id,
            note: `Funding fee (long) — ${batchId}`,
            wallet: WalletPool.funding,
          });
        } else {
          await this.tradingFees.creditKc({
            userId: pos.userId,
            quoteId,
            amountKc: payment,
            refType: 'futures_funding',
            refId: pos.id,
            note: `Funding nhận (short) — ${batchId}`,
            wallet: WalletPool.funding,
          });
        }
        applied += 1;
      } catch (e) {
        this.logger.warn(
          `Funding skip position ${pos.id}: ${(e as Error).message}`,
        );
      }
    }

    if (applied > 0) {
      this.logger.log(`Funding: đã xử lý ${applied} vị thế.`);
    }
  }
}
