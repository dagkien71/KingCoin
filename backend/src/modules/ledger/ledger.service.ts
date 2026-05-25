import { UserRepository } from '@modules/user/user.repository';
import { Injectable } from '@nestjs/common';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { LedgerEntry, Prisma, WalletPool } from '@prisma/client';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PrismaService } from '@providers/prisma';

export type BalanceSnapshot = {
  quoteKc: number;
  spotKc: number;
  futuresKc: number;
  fundingKc: number;
  walletCode: string | null;
  tokens: { tokenId: string; symbol: string | null; amount: number }[];
};

@Injectable()
export class LedgerService {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
  ) {
    this.paginate = paginator({ page: 1, perPage: 30 });
  }

  async append(params: {
    userId: string;
    amount: number;
    currency: 'KC' | 'TOKEN';
    tokenId?: string;
    refType: string;
    refId?: string;
    note?: string;
    /** Ví KC để hiển thị cột «Sau GD» — mặc định Spot */
    walletPool?: WalletPool;
  }): Promise<LedgerEntry> {
    const balanceAfter =
      params.currency === 'KC'
        ? await this.balanceKcAfter(params.userId, params.walletPool)
        : params.tokenId
          ? await this.userRepository.getTokenBalance(
              params.userId,
              params.tokenId,
            )
          : 0;

    return this.prisma.ledgerEntry.create({
      data: {
        userId: params.userId,
        amount: params.amount,
        currency: params.currency,
        tokenId: params.tokenId,
        refType: params.refType,
        refId: params.refId,
        balanceAfter,
        note: params.note,
      },
    });
  }

  async findForUser(
    userId: string,
    page = 1,
    perPage = 30,
  ): Promise<PaginatorTypes.PaginatedResult<LedgerEntry>> {
    return this.paginate(
      this.prisma.ledgerEntry,
      {
        where: { userId },
        orderBy: { createdAt: 'desc' },
      },
      { page, perPage },
    );
  }

  async getBalances(userId: string): Promise<BalanceSnapshot> {
    const quoteKc = await this.userRepository.getQuoteBalance(userId);
    const walletCode = await this.userRepository.ensureWalletCode(userId);
    const balance = await this.prisma.balance.findUnique({
      where: { userId },
      include: { tokens: true },
    });
    const futuresKc = balance?.futuresKc ?? 0;
    const fundingKc = balance?.fundingKc ?? 0;
    const quoteId = await this.userRepository.getQuoteTokenId();
    const tokenIds = (balance?.tokens ?? [])
      .filter((t) => t.tokenId !== quoteId && t.amount > 1e-12)
      .map((t) => t.tokenId);

    const cryptos =
      tokenIds.length > 0
        ? await this.prisma.tokenCrypto.findMany({
            where: { id: { in: tokenIds } },
            select: { id: true, symbol: true },
          })
        : [];

    const symMap = new Map(cryptos.map((c) => [c.id, c.symbol]));

    const tokens = (balance?.tokens ?? [])
      .filter((t) => t.tokenId !== quoteId && t.amount > 1e-12)
      .map((t) => ({
        tokenId: t.tokenId,
        symbol: symMap.get(t.tokenId) ?? null,
        amount: t.amount,
      }));

    return {
      quoteKc,
      spotKc: quoteKc,
      futuresKc,
      fundingKc,
      walletCode,
      tokens,
    };
  }

  private async balanceKcAfter(
    userId: string,
    pool?: WalletPool,
  ): Promise<number> {
    if (pool === WalletPool.futures) {
      return this.userRepository.getWalletKc(userId, WalletPool.futures);
    }
    if (pool === WalletPool.funding) {
      return this.userRepository.getWalletKc(userId, WalletPool.funding);
    }
    return this.userRepository.getQuoteBalance(userId);
  }
}
