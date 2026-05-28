import { isLiquidityBotEmail } from '@common/system-accounts.util';
import { PrismaService } from '@providers/prisma';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MmLiquidityBootstrapService } from './mm-liquidity-bootstrap.service';
import { TokenDedicatedBotsCatalogService } from './token-dedicated-bots-catalog.service';

type BotRow = {
  id: string;
  email: string | null;
  username: string | null;
  accountTags: string[] | null;
};

@Injectable()
export class LiquidityBotRebalanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LiquidityBotRebalanceService.name);
  private handle: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly botCatalog: TokenDedicatedBotsCatalogService,
    private readonly liquidityBootstrap: MmLiquidityBootstrapService,
  ) {}

  private enabled(): boolean {
    return String(process.env.MARKET_BOT_REBALANCE_ENABLED ?? 'true') === 'true';
  }

  private intervalMs(): number {
    return Number(process.env.MARKET_BOT_REBALANCE_INTERVAL_MS ?? '5000');
  }

  private quoteName(): string {
    return process.env.QUOTE_TOKEN_NAME ?? 'KingCoin';
  }

  private kcTarget(): number {
    return Number(process.env.MARKET_BOT_REBALANCE_KC_TARGET ?? process.env.MARKET_MAKER_SEED_BALANCE ?? '500000000');
  }

  private baseTarget(): number {
    return Number(process.env.MARKET_BOT_REBALANCE_BASE_TARGET ?? process.env.MARKET_MAKER_BASE_BALANCE ?? '5000000');
  }

  private donorBufferPct(): number {
    return Number(process.env.MARKET_BOT_REBALANCE_DONOR_BUFFER_PCT ?? '0.1'); // 10%
  }

  private allowMintTopup(): boolean {
    // If enabled, when there is no donor with surplus, we will top-up (mint) balances up to target.
    // This is useful for demo environments to keep the orderbook alive.
    return String(process.env.MARKET_BOT_REBALANCE_ALLOW_MINT ?? 'true') === 'true';
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled()) {
      this.logger.log('Rebalance: tắt (MARKET_BOT_REBALANCE_ENABLED=false)');
      return;
    }
    await this.botCatalog.whenReady();
    const ms = this.intervalMs();
    if (!Number.isFinite(ms) || ms < 1000) {
      this.logger.warn(`Rebalance: interval không hợp lệ: ${ms}ms`);
      return;
    }
    this.handle = setInterval(() => void this.rebalanceOnce(), ms);
    this.logger.log(`Rebalance: interval ${ms}ms`);
  }

  onModuleDestroy(): void {
    if (this.handle) clearInterval(this.handle);
    this.handle = null;
  }

  private async listLiquidityBots(): Promise<BotRow[]> {
    // Broad query then filter by isLiquidityBotEmail to include:
    // - tagged liquidity bots
    // - legacy mm/flow emails
    // - dedicated bots (bot-<symbol>-<n>@kingcoin.local)
    const rows = await this.prisma.user.findMany({
      where: {
        OR: [
          { accountTags: { has: 'liquidity_bot' } },
          { email: { endsWith: '@kingcoin.local' } },
        ],
      },
      select: { id: true, email: true, username: true, accountTags: true },
    });
    return rows.filter((u) => isLiquidityBotEmail(u.email, u.username, u.accountTags));
  }

  private async listRebalanceTokenIds(quoteId: string | null): Promise<string[]> {
    const tokens = await this.prisma.tokenCrypto.findMany({
      where: { status: 'active' },
      select: { id: true, tokenKind: true, name: true },
      orderBy: { rank: 'asc' },
    });
    const quoteName = this.quoteName();
    return tokens
      .filter((t) => {
        if (quoteId && t.id === quoteId) return false;
        if (t.name === quoteName) return false;
        if (t.tokenKind === 'stablecoin') return false;
        return true;
      })
      .map((t) => t.id);
  }

  private async ensureBalanceIds(botIds: string[]): Promise<Map<string, string>> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: botIds } },
      select: { id: true, balanceId: true },
    });
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.balanceId) map.set(u.id, u.balanceId);
    }
    const missing = users.filter((u) => !u.balanceId).map((u) => u.id);
    for (const userId of missing) {
      // Some environments have Balance row but user.balanceId is null.
      // Use upsert to avoid unique constraint races on Balance_userId_key.
      const balance = await this.prisma.balance.upsert({
        where: { userId },
        update: {},
        create: { userId, stableCoin: 0, futuresKc: 0, fundingKc: 0 },
        select: { id: true },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: { balanceId: balance.id },
      });
      map.set(userId, balance.id);
    }
    return map;
  }

  private async readTokenAmounts(
    balanceIds: string[],
    tokenId: string,
  ): Promise<Map<string, { id: string; amount: number }>> {
    const rows = await this.prisma.balanceToken.findMany({
      where: { balanceId: { in: balanceIds }, tokenId },
      select: { id: true, balanceId: true, amount: true },
    });
    const map = new Map<string, { id: string; amount: number }>();
    for (const r of rows) map.set(r.balanceId, { id: r.id, amount: Number(r.amount ?? 0) });
    return map;
  }

  private async transferTokenBetweenBots(opts: {
    fromBalanceId: string;
    toBalanceId: string;
    tokenId: string;
    amount: number;
  }): Promise<void> {
    const { fromBalanceId, toBalanceId, tokenId, amount } = opts;
    if (amount <= 0 || !Number.isFinite(amount)) return;

    await this.prisma.$transaction(async (tx) => {
      const [fromRow, toRow] = await Promise.all([
        tx.balanceToken.findFirst({
          where: { balanceId: fromBalanceId, tokenId },
        }),
        tx.balanceToken.findFirst({
          where: { balanceId: toBalanceId, tokenId },
        }),
      ]);

      const fromAmt = Number(fromRow?.amount ?? 0);
      if (fromAmt < amount - 1e-9) return;

      if (fromRow) {
        await tx.balanceToken.update({
          where: { id: fromRow.id },
          data: { amount: fromAmt - amount },
        });
      } else {
        // nothing to take
        return;
      }

      const toAmt = Number(toRow?.amount ?? 0);
      if (toRow) {
        await tx.balanceToken.update({
          where: { id: toRow.id },
          data: { amount: toAmt + amount },
        });
      } else {
        await tx.balanceToken.create({
          data: { balanceId: toBalanceId, tokenId, amount },
        });
      }
    });
  }

  private async forceTopupBalanceToken(opts: {
    email: string | null;
    tokenId: string;
    target: number;
  }): Promise<boolean> {
    if (!this.allowMintTopup()) return false;
    if (!opts.email) return false;
    if (!Number.isFinite(opts.target) || opts.target <= 0) return false;
    const user = await this.prisma.user.findUnique({
      where: { email: opts.email },
      select: { id: true, balanceId: true },
    });
    if (!user) return false;

    // Ensure balance row and user.balanceId are consistent.
    const balance = await this.prisma.balance.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, stableCoin: 0, futuresKc: 0, fundingKc: 0 },
      select: { id: true },
    });
    if (!user.balanceId || user.balanceId !== balance.id) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { balanceId: balance.id },
      });
    }

    const maxRetry = 6;
    for (let attempt = 0; attempt < maxRetry; attempt++) {
      try {
        const row = await this.prisma.balanceToken.findFirst({
          where: { balanceId: balance.id, tokenId: opts.tokenId },
          select: { id: true, amount: true },
        });
        const current = Number(row?.amount ?? 0);
        if (current >= opts.target) return true;

        if (row?.id) {
          await this.prisma.balanceToken.update({
            where: { id: row.id },
            data: { amount: opts.target },
          });
        } else {
          await this.prisma.balanceToken.create({
            data: { balanceId: balance.id, tokenId: opts.tokenId, amount: opts.target },
          });
        }
        return true;
      } catch (e) {
        const code = (e as { code?: string } | null)?.code;
        if (code === 'P2034' && attempt < maxRetry - 1) {
          const backoff = 20 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        throw e;
      }
    }
    return false;
  }

  private async rebalanceQuoteKc(opts: {
    quoteId: string;
    bots: BotRow[];
    botBalances: Map<string, string>;
  }): Promise<number> {
    const { quoteId, botBalances, bots } = opts;
    const target = this.kcTarget();
    if (!Number.isFinite(target) || target <= 0) return 0;

    const balanceIds = [...botBalances.values()];
    const amounts = await this.readTokenAmounts(balanceIds, quoteId);

    const bufferPct = this.donorBufferPct();
    const donorFloor = target * (1 + (Number.isFinite(bufferPct) ? bufferPct : 0));

    const byBalance = balanceIds.map((balanceId) => ({
      balanceId,
      amount: amounts.get(balanceId)?.amount ?? 0,
    }));
    byBalance.sort((a, b) => b.amount - a.amount);

    let moved = 0;

    for (const needy of byBalance.filter((b) => b.amount < target - 1e-9)) {
      const need = target - needy.amount;
      if (need <= 0) continue;
      const donor = byBalance.find((d) => d.amount > donorFloor + 1e-9);
      if (!donor) {
        const bot = bots.find((b) => botBalances.get(b.id) === needy.balanceId) ?? null;
        const minted = await this.forceTopupBalanceToken({
          email: bot?.email ?? null,
          tokenId: quoteId,
          target,
        });
        if (minted) moved += 1;
        continue;
      }

      const canGive = Math.max(0, donor.amount - donorFloor);
      const delta = Math.min(need, canGive);
      if (delta <= 0) break;

      await this.transferTokenBetweenBots({
        fromBalanceId: donor.balanceId,
        toBalanceId: needy.balanceId,
        tokenId: quoteId,
        amount: delta,
      });

      donor.amount -= delta;
      needy.amount += delta;
      moved += 1;
    }

    return moved;
  }

  private async rebalanceBaseTokens(opts: {
    tokenIds: string[];
    bots: BotRow[];
    botBalances: Map<string, string>;
  }): Promise<number> {
    const { tokenIds, botBalances, bots } = opts;
    const target = this.baseTarget();
    if (!Number.isFinite(target) || target <= 0) return 0;

    const bufferPct = this.donorBufferPct();
    const donorFloor = target * (1 + (Number.isFinite(bufferPct) ? bufferPct : 0));

    const balanceIds = [...botBalances.values()];
    let moved = 0;

    for (const tokenId of tokenIds) {
      const amounts = await this.readTokenAmounts(balanceIds, tokenId);
      const byBalance = balanceIds.map((balanceId) => ({
        balanceId,
        amount: amounts.get(balanceId)?.amount ?? 0,
      }));
      byBalance.sort((a, b) => b.amount - a.amount);

      for (const needy of byBalance.filter((b) => b.amount < target - 1e-9)) {
        const need = target - needy.amount;
        if (need <= 0) continue;
        const donor = byBalance.find((d) => d.amount > donorFloor + 1e-9);
        if (!donor) {
          const bot = bots.find((b) => botBalances.get(b.id) === needy.balanceId) ?? null;
          const minted = await this.forceTopupBalanceToken({
            email: bot?.email ?? null,
            tokenId,
            target,
          });
          if (minted) moved += 1;
          continue;
        }

        const canGive = Math.max(0, donor.amount - donorFloor);
        const delta = Math.min(need, canGive);
        if (delta <= 0) break;

        await this.transferTokenBetweenBots({
          fromBalanceId: donor.balanceId,
          toBalanceId: needy.balanceId,
          tokenId,
          amount: delta,
        });

        donor.amount -= delta;
        needy.amount += delta;
        moved += 1;
      }
    }

    return moved;
  }

  /**
   * Kiểm tra và tạo dedicated bots cho bất kỳ token active nào chưa có bots.
   * Chạy trước mỗi cycle để tự phục hồi sau khi thêm token mới.
   */
  private async ensureMissingBots(): Promise<void> {
    if (!this.botCatalog.usesDedicatedPool()) return;

    const quoteName = this.quoteName();
    const tokens = await this.prisma.tokenCrypto.findMany({
      where: { status: 'active' },
      select: { id: true, symbol: true, name: true, tokenKind: true },
    });
    const baseTokens = tokens.filter(
      (t) => t.symbol && t.name !== quoteName && t.tokenKind !== 'stablecoin',
    );

    for (const token of baseTokens) {
      if (!token.symbol) continue;
      const groups = this.botCatalog.getTokenGroups();
      const alreadyInCatalog = groups.some((g) => g.tokenId === token.id);
      if (alreadyInCatalog) continue;

      // Token có trong DB nhưng chưa có bots — tạo tự động.
      await this.liquidityBootstrap
        .ensureBotsForToken(token.id, token.symbol)
        .catch((err) =>
          this.logger.warn(
            `Auto-create bots ${token.symbol}: ${(err as Error).message}`,
          ),
        );
    }
  }

  async rebalanceOnce(): Promise<void> {
    try {
      await this.ensureMissingBots();

      const bots = await this.listLiquidityBots();
      if (bots.length < 2) return;

      const quote = await this.prisma.tokenCrypto.findFirst({
        where: { name: this.quoteName() },
        select: { id: true },
      });
      const quoteId = quote?.id ?? null;

      const botBalances = await this.ensureBalanceIds(bots.map((b) => b.id));

      let moved = 0;
      if (quoteId) {
        moved += await this.rebalanceQuoteKc({ quoteId, bots, botBalances });
      }
      const baseTokenIds = await this.listRebalanceTokenIds(quoteId);
      moved += await this.rebalanceBaseTokens({
        tokenIds: baseTokenIds,
        bots,
        botBalances,
      });

      if (moved > 0) {
        this.logger.log(`Rebalance: moved ${moved} transfers (bots=${bots.length}, tokens=${baseTokenIds.length})`);
      }
    } catch (e) {
      this.logger.warn(`Rebalance lỗi: ${(e as Error).message}`);
    }
  }
}

