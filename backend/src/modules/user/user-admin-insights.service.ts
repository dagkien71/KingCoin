import {
  isLiquidityBotEmail,
  resolveUserAccountTags,
} from '../../common/system-accounts.util';
import { LedgerService } from '@modules/ledger/ledger.service';
import { FuturesEngineService } from '@modules/futures/futures-engine.service';
import { PortfolioPnlService } from '@modules/user/portfolio-pnl.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import {
  FuturesPositionStatus,
  LedgerEntry,
  Order,
  OrderStatus,
  Prisma,
  User,
} from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';

export type AdminUserStats = {
  navKc: number;
  quoteKc: number;
  altValueKc: number;
  openSpotOrders: number;
  completedSpotOrders: number;
  canceledSpotOrders: number;
  spotFillCount: number;
  spotVolumeKc: number;
  openFuturesPositions: number;
  futuresUnrealizedPnlKc: number;
  futuresRealizedPnlKc: number;
  futuresMarginKc: number;
};

export type AdminUserOverview = {
  user: User & { accountTags?: string[] };
  stats: AdminUserStats;
  balances: Awaited<ReturnType<LedgerService['getBalances']>>;
  isLiquidityBot: boolean;
};

@Injectable()
export class UserAdminInsightsService {
  private readonly paginate = paginator({ page: 1, perPage: 30 });

  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioPnl: PortfolioPnlService,
    private readonly ledgerService: LedgerService,
    private readonly futuresEngine: FuturesEngineService,
  ) {}

  async getOverview(userId: string): Promise<AdminUserOverview> {
    await this.findUserOrThrow(userId);
    const user = await this.portfolioPnl.syncUserNavPnL(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const balances = await this.ledgerService.getBalances(userId);
    const stats = await this.computeStats(userId, balances.quoteKc);

    const accountTags = resolveUserAccountTags(
      user.email,
      user.username,
      (user as User & { accountTags?: string[] }).accountTags ?? [],
    );
    return {
      user: { ...user, accountTags },
      stats,
      balances,
      isLiquidityBot: accountTags.length > 0,
    };
  }

  async findUserOrThrow(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      isLiquidityBotEmail(
        user.email,
        user.username,
        (user as User & { accountTags?: string[] }).accountTags ?? [],
      )
    ) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    return user;
  }

  async listOrders(
    userId: string,
    params: {
      status?: 'pending' | 'complete' | 'cancel';
      page?: number;
      perPage?: number;
    },
  ): Promise<PaginatorTypes.PaginatedResult<Order & { symbol?: string | null }>> {
    await this.findUserOrThrow(userId);

    const statusMap: Record<string, OrderStatus> = {
      pending: OrderStatus.pending,
      complete: OrderStatus.completed,
      cancel: OrderStatus.canceled,
    };

    const where: Prisma.OrderWhereInput = { userId };
    if (params.status && statusMap[params.status]) {
      where.status = statusMap[params.status];
    }

    const result = (await this.paginate(
      this.prisma.order,
      {
        where,
        orderBy: { createdAt: 'desc' },
      },
      {
        page: params.page ?? 1,
        perPage: Math.min(100, params.perPage ?? 30),
      },
    )) as PaginatorTypes.PaginatedResult<Order>;

    const tokenIds = [
      ...new Set(result.data.map((o) => o.tokenId).filter(Boolean)),
    ];
    const tokens =
      tokenIds.length > 0
        ? await this.prisma.tokenCrypto.findMany({
            where: { id: { in: tokenIds } },
            select: { id: true, symbol: true },
          })
        : [];
    const symMap = new Map(tokens.map((t) => [t.id, t.symbol]));

    return {
      ...result,
      data: result.data.map((o) => ({
        ...o,
        symbol: symMap.get(o.tokenId) ?? null,
      })),
    };
  }

  async listLedger(
    userId: string,
    page = 1,
    perPage = 30,
  ): Promise<PaginatorTypes.PaginatedResult<LedgerEntry>> {
    await this.findUserOrThrow(userId);
    return this.ledgerService.findForUser(
      userId,
      page,
      Math.min(100, perPage),
    );
  }

  private async computeStats(
    userId: string,
    quoteKc: number,
  ): Promise<AdminUserStats> {
    const [navKc, altValueKc] = await Promise.all([
      this.portfolioPnl.computeNavKc(userId),
      this.portfolioPnl.computeSpotAltValueKc(userId),
    ]);

    const [openSpotOrders, completedSpotOrders, canceledSpotOrders, fills] =
      await Promise.all([
        this.prisma.order.count({
          where: { userId, status: OrderStatus.pending },
        }),
        this.prisma.order.count({
          where: { userId, status: OrderStatus.completed },
        }),
        this.prisma.order.count({
          where: { userId, status: OrderStatus.canceled },
        }),
        this.prisma.tradeFill.findMany({
          where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
          select: { price: true, quantity: true },
        }),
      ]);

    let spotVolumeKc = 0;
    for (const f of fills) {
      spotVolumeKc += (f.price ?? 0) * (f.quantity ?? 0);
    }

    const openPositions = await this.futuresEngine.listOpenPositions(userId);
    let futuresUnrealizedPnlKc = 0;
    let futuresMarginKc = 0;
    for (const p of openPositions) {
      futuresUnrealizedPnlKc += p.unrealizedPnlKc ?? 0;
      futuresMarginKc += p.marginKc ?? 0;
    }

    const realizedAgg = await this.prisma.futuresPosition.aggregate({
      where: {
        userId,
        status: {
          in: [
            FuturesPositionStatus.closed,
            FuturesPositionStatus.liquidated,
          ],
        },
      },
      _sum: { realizedPnlKc: true },
    });

    return {
      navKc,
      quoteKc,
      altValueKc,
      openSpotOrders,
      completedSpotOrders,
      canceledSpotOrders,
      spotFillCount: fills.length,
      spotVolumeKc: Number(spotVolumeKc.toFixed(8)),
      openFuturesPositions: openPositions.length,
      futuresUnrealizedPnlKc: Number(futuresUnrealizedPnlKc.toFixed(8)),
      futuresRealizedPnlKc: Number(
        (realizedAgg._sum.realizedPnlKc ?? 0).toFixed(8),
      ),
      futuresMarginKc: Number(futuresMarginKc.toFixed(8)),
    };
  }
}
