import {
  TRADING_FEES,
  feeFromNotional,
} from '../../common/trading-fees.config';
import { LedgerService } from '@modules/ledger/ledger.service';
import { UserRepository } from '@modules/user/user.repository';
import { Injectable } from '@nestjs/common';
import { WalletPool } from '@prisma/client';

export type TradingFeeRatesDto = {
  spot: { makerRate: number; takerRate: number };
  convert: { rate: number };
  futures: {
    openRate: number;
    closeRate: number;
    fundingRate: number;
    liquidationFeeRate: number | null;
  };
};

@Injectable()
export class TradingFeeService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly ledgerService: LedgerService,
  ) {}

  getRates(liquidationFeeRate?: number | null): TradingFeeRatesDto {
    return {
      spot: {
        makerRate: TRADING_FEES.spotMakerRate,
        takerRate: TRADING_FEES.spotTakerRate,
      },
      convert: { rate: TRADING_FEES.convertRate },
      futures: {
        openRate: TRADING_FEES.futuresOpenRate,
        closeRate: TRADING_FEES.futuresCloseRate,
        fundingRate: TRADING_FEES.futuresFundingRate,
        liquidationFeeRate: liquidationFeeRate ?? null,
      },
    };
  }

  spotFee(notionalKc: number, isMaker: boolean): number {
    const rate = isMaker
      ? TRADING_FEES.spotMakerRate
      : TRADING_FEES.spotTakerRate;
    return feeFromNotional(notionalKc, rate);
  }

  convertFee(kcValue: number): number {
    return feeFromNotional(kcValue, TRADING_FEES.convertRate);
  }

  futuresOpenFee(notionalKc: number): number {
    return feeFromNotional(notionalKc, TRADING_FEES.futuresOpenRate);
  }

  futuresCloseFee(notionalKc: number): number {
    return feeFromNotional(notionalKc, TRADING_FEES.futuresCloseRate);
  }

  futuresFundingPayment(notionalKc: number): number {
    return feeFromNotional(notionalKc, TRADING_FEES.futuresFundingRate);
  }

  /** Trừ phí KC và ghi sổ cái */
  async collectKcFee(params: {
    userId: string;
    quoteId: string;
    feeKc: number;
    refType: string;
    refId: string;
    note: string;
    wallet?: WalletPool;
    /** false = chỉ ghi sổ (phí đã trừ trong một lần cộng ví khác) */
    deductWallet?: boolean;
    skipLedger?: boolean;
  }): Promise<void> {
    const { userId, quoteId, feeKc, refType, refId, note } = params;
    const wallet = params.wallet ?? WalletPool.spot;
    if (feeKc <= 1e-12) return;

    if (params.deductWallet !== false) {
      await this.userRepository.adjustWalletKc(userId, wallet, -feeKc);
    }
    if (!params.skipLedger) {
      await this.ledgerService.append({
        userId,
        amount: -feeKc,
        currency: 'KC',
        tokenId: quoteId,
        refType,
        refId,
        note,
        walletPool: wallet,
      });
    }
  }

  /** Cộng KC (funding cho short) */
  async creditKc(params: {
    userId: string;
    quoteId: string;
    amountKc: number;
    refType: string;
    refId: string;
    note: string;
    wallet?: WalletPool;
  }): Promise<void> {
    const { userId, quoteId, amountKc, refType, refId, note } = params;
    const wallet = params.wallet ?? WalletPool.spot;
    if (amountKc <= 1e-12) return;

    await this.userRepository.adjustWalletKc(userId, wallet, amountKc);
    await this.ledgerService.append({
      userId,
      amount: amountKc,
      currency: 'KC',
      tokenId: quoteId,
      refType,
      refId,
      note,
      walletPool: wallet,
    });
  }
}
