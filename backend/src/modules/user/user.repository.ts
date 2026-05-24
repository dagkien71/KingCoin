import { PrismaService } from '@providers/prisma';
import { Injectable } from '@nestjs/common';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    /**
     * @desc Create a paginate function
     * @param model
     * @param options
     * @returns Promise<PaginatorTypes.PaginatedResult<T>>
     */
    this.paginate = paginator({
      page: 1,
      perPage: 10,
    });
  }

  findById(id: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * @desc Find a user by params
   * @param params Prisma.UserFindFirstArgs
   * @returns Promise<User | null>
   *       If the user is not found, return null
   */
  async findOne(params: Prisma.UserFindFirstArgs): Promise<User | null> {
    const { include: _ignore, ...rest } = params;
    const row = await this.prisma.user.findFirst({
      ...rest,
      include: {
        orders: true,
        balance: { include: { tokens: true } },
      },
    });
    if (!row) return null;
    return this.toUserWithQuoteBalance(row as unknown as Record<string, unknown>);
  }

  /**
   * `balance` trên API = số dư KingCoin (quote) trong BalanceToken, fallback stableCoin.
   */
  private async toUserWithQuoteBalance(row: Record<string, unknown>): Promise<User> {
    const quoteName = process.env.QUOTE_TOKEN_NAME ?? 'KingCoin';
    const quote = await this.prisma.tokenCrypto.findFirst({
      where: { name: quoteName },
    });
    const bal = row.balance as
      | {
          stableCoin?: number;
          tokens?: { tokenId: string; amount: number }[];
        }
      | null
      | undefined;
    let displayBalance = bal?.stableCoin ?? 0;
    if (quote && bal?.tokens?.length) {
      const hit = bal.tokens.find((t) => t.tokenId === quote.id);
      if (hit) displayBalance = hit.amount;
    }
    const { balance: _balanceNested, ...rest } = row;
    return { ...rest, balance: displayBalance } as unknown as User;
  }

  /**
   * @desc Create a new user
   * @param data Prisma.UserCreateInput
   * @returns Promise<User>
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  /**
   * @desc Find all users with pagination
   * @param where Prisma.UserWhereInput
   * @param orderBy Prisma.UserOrderByWithRelationInput
   * @returns Promise<PaginatorTypes.PaginatedResult<User>>
   */
  async findAll(
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    return this.paginate(this.prisma.user, {
      where,
      orderBy,
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Adjust stableCoin on the user's Balance row (trade settlement).
   */
  async adjustStableCoinByUserId(userId: string, delta: number): Promise<void> {
    await this.prisma.balance.update({
      where: { userId },
      data: { stableCoin: { increment: delta } },
    });
  }

  /**
   * Điều chỉnh số dư token quote (KingCoin) trong ví.
   */
  async adjustBalanceTokenByUserId(
    userId: string,
    tokenId: string,
    delta: number,
  ): Promise<void> {
    let balance = await this.prisma.balance.findUnique({
      where: { userId },
    });
    if (!balance) {
      balance = await this.prisma.balance.create({
        data: { userId, stableCoin: 0 },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: { balanceId: balance.id },
      });
    }
    const row = await this.prisma.balanceToken.findFirst({
      where: { balanceId: balance.id, tokenId },
    });
    if (row) {
      await this.prisma.balanceToken.update({
        where: { id: row.id },
        data: { amount: { increment: delta } },
      });
    } else {
      if (delta < 0) {
        throw new Error(
          `Không đủ ${tokenId} (quote) — user ${userId}`,
        );
      }
      await this.prisma.balanceToken.create({
        data: { balanceId: balance.id, tokenId, amount: delta },
      });
    }
  }

  /**
   * Tặng KC ban đầu cho user mới (một lần, nếu chưa có dòng BalanceToken quote).
   */
  async getQuoteTokenId(): Promise<string | null> {
    const quoteName = process.env.QUOTE_TOKEN_NAME ?? 'KingCoin';
    const quote = await this.prisma.tokenCrypto.findFirst({
      where: { name: quoteName },
    });
    return quote?.id ?? null;
  }

  async getQuoteBalance(userId: string): Promise<number> {
    const quoteId = await this.getQuoteTokenId();
    const balance = await this.prisma.balance.findUnique({
      where: { userId },
      include: { tokens: true },
    });
    if (!balance) return 0;
    if (quoteId && balance.tokens?.length) {
      const hit = balance.tokens.find((t) => t.tokenId === quoteId);
      if (hit) return hit.amount;
    }
    return balance.stableCoin ?? 0;
  }

  async getTokenBalance(userId: string, tokenId: string): Promise<number> {
    const balance = await this.prisma.balance.findUnique({
      where: { userId },
      include: { tokens: true },
    });
    if (!balance?.tokens?.length) return 0;
    const hit = balance.tokens.find((t) => t.tokenId === tokenId);
    return hit?.amount ?? 0;
  }

  /**
   * Điều chỉnh số dư token base (không phải quote KC).
   */
  async adjustBaseTokenByUserId(
    userId: string,
    tokenId: string,
    delta: number,
  ): Promise<void> {
    let balance = await this.prisma.balance.findUnique({
      where: { userId },
    });
    if (!balance) {
      balance = await this.prisma.balance.create({
        data: { userId, stableCoin: 0 },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: { balanceId: balance.id },
      });
    }
    const row = await this.prisma.balanceToken.findFirst({
      where: { balanceId: balance.id, tokenId },
    });
    if (row) {
      const next = row.amount + delta;
      if (next < -1e-9) {
        throw new Error(`Không đủ token — user ${userId}`);
      }
      await this.prisma.balanceToken.update({
        where: { id: row.id },
        data: { amount: next },
      });
    } else {
      if (delta < 0) {
        throw new Error(`Không đủ token — user ${userId}`);
      }
      await this.prisma.balanceToken.create({
        data: { balanceId: balance.id, tokenId, amount: delta },
      });
    }
  }

  async incrementDailyPnL(userId: string, delta: number): Promise<void> {
    if (!Number.isFinite(delta) || delta === 0) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { dailyPnL: { increment: delta } },
    });
  }

  async seedInitialQuoteTokenForUser(
    userId: string,
    amount: number,
  ): Promise<void> {
    const quoteName = process.env.QUOTE_TOKEN_NAME ?? 'KingCoin';
    const quote = await this.prisma.tokenCrypto.findFirst({
      where: { name: quoteName },
    });
    if (!quote?.id || !Number.isFinite(amount) || amount <= 0) {
      return;
    }
    const balance = await this.prisma.balance.findUnique({
      where: { userId },
    });
    if (!balance) {
      return;
    }
    const existing = await this.prisma.balanceToken.findFirst({
      where: { balanceId: balance.id, tokenId: quote.id },
    });
    if (existing) {
      return;
    }
    await this.prisma.balanceToken.create({
      data: {
        balanceId: balance.id,
        tokenId: quote.id,
        amount,
      },
    });
  }
}
