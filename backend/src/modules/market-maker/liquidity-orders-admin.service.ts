import { TokenDedicatedBotsCatalogService } from '@modules/market-maker/token-dedicated-bots-catalog.service';
import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma';

export type LiquidityBotRole = 'mm' | 'flow' | 'user_bot';

export type LiquidityOrdersQuery = {
  tokenId?: string;
  role?: LiquidityBotRole;
  pendingLimit?: number;
  fillsLimit?: number;
};

function clampLimit(raw: number | undefined, fallback: number, max: number): number {
  if (raw == null || !Number.isFinite(raw)) return fallback;
  return Math.max(10, Math.min(max, Math.floor(raw)));
}

@Injectable()
export class LiquidityOrdersAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly botCatalog: TokenDedicatedBotsCatalogService,
  ) {}

  private userBotEmail(): string {
    return (process.env.USER_BOT_EMAIL ?? 'user-bot@kingcoin.local').trim();
  }

  private resolveRole(
    email: string,
    mmSet: Set<string>,
    flowSet: Set<string>,
  ): LiquidityBotRole {
    const e = email.toLowerCase();
    if (e === this.userBotEmail().toLowerCase()) return 'user_bot';
    if (flowSet.has(e)) return 'flow';
    return 'mm';
  }

  async getMonitor(query: LiquidityOrdersQuery = {}) {
    const mmEmails = this.botCatalog.getMmEmails();
    const flowEmails = this.botCatalog.getFlowEmails();
    const flowSet = new Set(flowEmails.map((e) => e.toLowerCase()));
    const mmSet = new Set(mmEmails.map((e) => e.toLowerCase()));
    const userBot = this.userBotEmail();

    const allEmails = [
      ...new Set([...mmEmails, ...flowEmails, userBot].filter(Boolean)),
    ];

    const users = await this.prisma.user.findMany({
      where: { email: { in: allEmails } },
      select: { id: true, email: true, username: true },
    });

    const bots = users.map((u) => ({
      userId: u.id,
      email: u.email ?? '',
      username: u.username ?? null,
      role: this.resolveRole(u.email ?? '', mmSet, flowSet),
      configured: true,
    }));

    const configuredEmails = new Set(
      bots.map((b) => b.email.toLowerCase()),
    );
    for (const email of allEmails) {
      if (!configuredEmails.has(email.toLowerCase())) {
        bots.push({
          userId: '',
          email,
          username: null,
          role: this.resolveRole(email, mmSet, flowSet),
          configured: false,
        });
      }
    }

    let botUserIds = users.map((u) => u.id);
    if (query.role) {
      const roleEmails = new Set(
        bots.filter((b) => b.role === query.role && b.userId).map((b) => b.userId),
      );
      botUserIds = botUserIds.filter((id) => roleEmails.has(id));
    }

    if (botUserIds.length === 0) {
      return {
        at: Date.now(),
        summary: {
          pendingTotal: 0,
          pendingMm: 0,
          pendingFlow: 0,
          pendingUserBot: 0,
          fillsShown: 0,
          fillsVolumeKc: 0,
        },
        bots,
        pendingOrders: [],
        fills: [],
        tokens: [],
      };
    }

    const pendingLimit = clampLimit(query.pendingLimit, 250, 600);
    const fillsLimit = clampLimit(query.fillsLimit, 120, 400);

    const orderWhere: Prisma.OrderWhereInput = {
      userId: { in: botUserIds },
      status: OrderStatus.pending,
    };
    if (query.tokenId) orderWhere.tokenId = query.tokenId;

    const fillWhere: Prisma.TradeFillWhereInput = {
      OR: [{ buyerId: { in: botUserIds } }, { sellerId: { in: botUserIds } }],
    };
    if (query.tokenId) fillWhere.tokenId = query.tokenId;

    const [pendingOrders, fills] = await Promise.all([
      this.prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: 'desc' },
        take: pendingLimit,
      }),
      this.prisma.tradeFill.findMany({
        where: fillWhere,
        orderBy: { createdAt: 'desc' },
        take: fillsLimit,
      }),
    ]);

    const tokenIds = [
      ...new Set([
        ...pendingOrders.map((o) => o.tokenId),
        ...fills.map((f) => f.tokenId),
      ]),
    ];
    const tokens = tokenIds.length
      ? await this.prisma.tokenCrypto.findMany({
          where: { id: { in: tokenIds } },
          select: { id: true, symbol: true, name: true },
        })
      : [];

    const userById = new Map(users.map((u) => [u.id, u]));
    const emailById = new Map(
      users.map((u) => [u.id, (u.email ?? '').toLowerCase()]),
    );
    const roleByUserId = new Map(
      users.map((u) => [
        u.id,
        this.resolveRole(u.email ?? '', mmSet, flowSet),
      ]),
    );

    const pendingRows = pendingOrders.map((o) => {
      const u = userById.get(o.userId);
      const role = roleByUserId.get(o.userId) ?? 'mm';
      const token = tokens.find((t) => t.id === o.tokenId);
      return {
        id: o.id,
        userId: o.userId,
        botEmail: u?.email ?? '—',
        botRole: role,
        tokenId: o.tokenId,
        symbol: token?.symbol ?? '—',
        pair: o.pair,
        type: o.type,
        price: o.price,
        quantity: o.quantity,
        matchedQuantity: o.matchedQuantity,
        remaining: Math.max(0, o.quantity - (o.matchedQuantity ?? 0)),
        notionalKc: Number((o.price * o.quantity).toFixed(4)),
        createdAt: o.createdAt,
      };
    });

    const fillRows = fills.map((f) => {
      const buyer = userById.get(f.buyerId);
      const seller = userById.get(f.sellerId);
      const buyerRole = roleByUserId.get(f.buyerId);
      const sellerRole = roleByUserId.get(f.sellerId);
      const token = tokens.find((t) => t.id === f.tokenId);
      const buyerIsBot = emailById.has(f.buyerId);
      const sellerIsBot = emailById.has(f.sellerId);
      return {
        id: f.id,
        tokenId: f.tokenId,
        symbol: token?.symbol ?? '—',
        pair: token?.symbol ? `${token.symbol}/KC` : '—',
        price: f.price,
        quantity: f.quantity,
        notionalKc: Number((f.price * f.quantity).toFixed(4)),
        buyerId: f.buyerId,
        sellerId: f.sellerId,
        buyerEmail: buyer?.email ?? f.buyerId.slice(-6),
        sellerEmail: seller?.email ?? f.sellerId.slice(-6),
        buyerRole: buyerIsBot ? buyerRole : null,
        sellerRole: sellerIsBot ? sellerRole : null,
        takerSide: buyerIsBot ? ('buy' as const) : sellerIsBot ? ('sell' as const) : null,
        takerRole: buyerIsBot ? buyerRole : sellerIsBot ? sellerRole : null,
        createdAt: f.createdAt,
      };
    });

    const countByRole = (role: LiquidityBotRole) =>
      pendingRows.filter((r) => r.botRole === role).length;

    return {
      at: Date.now(),
      summary: {
        pendingTotal: pendingRows.length,
        pendingMm: countByRole('mm'),
        pendingFlow: countByRole('flow'),
        pendingUserBot: countByRole('user_bot'),
        fillsShown: fillRows.length,
        fillsVolumeKc: Number(
          fillRows.reduce((s, f) => s + f.notionalKc, 0).toFixed(2),
        ),
      },
      bots: bots.sort((a, b) => {
        const order: LiquidityBotRole[] = ['mm', 'flow', 'user_bot'];
        return order.indexOf(a.role) - order.indexOf(b.role);
      }),
      pendingOrders: pendingRows,
      fills: fillRows,
      tokens: tokens.map((t) => ({
        id: t.id,
        symbol: t.symbol ?? t.name ?? t.id,
      })),
    };
  }
}
