import { ACCOUNT_TAG_LIQUIDITY_BOT } from '@common/system-accounts.util';
import { BotInventoryService } from '@modules/market-maker/bot-inventory.service';
import { slotsForToken } from '@modules/market-maker/token-dedicated-bots.util';
import { TokenDedicatedBotsCatalogService } from '@modules/market-maker/token-dedicated-bots-catalog.service';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

export type LiquidityBotEnsureResult = {
  email: string;
  kind: 'mm' | 'flow';
  created: boolean;
  inventorySynced: boolean;
};

@Injectable()
export class MmLiquidityBootstrapService {
  private readonly logger = new Logger(MmLiquidityBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly botInventory: BotInventoryService,
    private readonly botCatalog: TokenDedicatedBotsCatalogService,
  ) {}

  private quoteName(): string {
    return process.env.QUOTE_TOKEN_NAME ?? 'KingCoin';
  }

  private kcTarget(kind: 'mm' | 'flow'): number {
    const raw =
      kind === 'flow'
        ? (process.env.MARKET_FLOW_KC_BALANCE ??
          process.env.MARKET_MAKER_SEED_BALANCE ??
          '500000000')
        : (process.env.MARKET_MAKER_SEED_BALANCE ?? '500000000');
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 500_000_000;
  }

  private password(kind: 'mm' | 'flow'): string {
    return kind === 'flow'
      ? (process.env.MARKET_FLOW_PASSWORD ?? 'flow-dev-change-me')
      : (process.env.MARKET_MAKER_PASSWORD ?? 'mm-dev-change-me');
  }

  private usernameFromEmail(email: string, fallback: string): string {
    const local = email.split('@')[0]?.trim();
    return local || fallback;
  }

  private async ensureQuoteKc(
    balanceId: string,
    quoteId: string,
    target: number,
  ): Promise<void> {
    const row = await this.prisma.balanceToken.findFirst({
      where: { balanceId, tokenId: quoteId },
    });
    const current = row?.amount ?? 0;
    if (current >= target) return;
    if (row) {
      await this.prisma.balanceToken.update({
        where: { id: row.id },
        data: { amount: target },
      });
    } else {
      await this.prisma.balanceToken.create({
        data: { balanceId, tokenId: quoteId, amount: target },
      });
    }
  }

  private async ensureBotUser(
    email: string,
    kind: 'mm' | 'flow',
  ): Promise<LiquidityBotEnsureResult> {
    const quote = await this.prisma.tokenCrypto.findFirst({
      where: { name: this.quoteName() },
      select: { id: true },
    });
    if (!quote?.id) {
      throw new Error(
        `Không tìm thấy token quote name="${this.quoteName()}" — seed token trước.`,
      );
    }

    const kc = this.kcTarget(kind);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    let created = false;

    if (existing) {
      const tags = Array.isArray(existing.accountTags)
        ? existing.accountTags
        : [];
      if (!tags.includes(ACCOUNT_TAG_LIQUIDITY_BOT)) {
        await this.prisma.user.update({
          where: { email },
          data: { accountTags: [...tags, ACCOUNT_TAG_LIQUIDITY_BOT] },
        });
      }
    } else {
      const hash = await bcrypt.hash(this.password(kind), 10);
      const username =
        kind === 'mm'
          ? this.usernameFromEmail(email, 'marketmaker')
          : this.usernameFromEmail(email, 'flowtrader');
      await this.prisma.user.create({
        data: {
          email,
          password: hash,
          username,
          accountTags: [ACCOUNT_TAG_LIQUIDITY_BOT],
          walletAddress: `0xBOT${randomBytes(18).toString('hex')}`,
          socialLinks: [],
          balance: {
            create: {
              stableCoin: 0,
              tokens: {
                create: [{ tokenId: quote.id, amount: kc }],
              },
            },
          },
        },
      });
      created = true;
      this.logger.log(`Created liquidity bot ${email}`);
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { balance: true },
    });
    if (!user) {
      throw new Error(`Không tạo được user ${email}`);
    }

    let balanceId = user.balance?.id;
    if (!balanceId) {
      const balance = await this.prisma.balance.create({
        data: { userId: user.id, stableCoin: 0 },
      });
      await this.prisma.user.update({
        where: { id: user.id },
        data: { balanceId: balance.id },
      });
      balanceId = balance.id;
    }

    await this.ensureQuoteKc(balanceId, quote.id, kc);
    const assign = this.botCatalog.getAssignment(email);
    if (assign) {
      await this.botInventory.syncBotInventoryForToken(email, assign.tokenId);
    } else {
      await this.botInventory.syncBotInventory(email);
    }

    return {
      email,
      kind,
      created,
      inventorySynced: true,
    };
  }

  /**
   * Tạo + cấp KC/token cho các dedicated bots của một token cụ thể.
   * Gọi tự động sau khi token go-live hoặc trong rebalance cycle.
   */
  async ensureBotsForToken(
    tokenId: string,
    symbol: string,
  ): Promise<{ created: number; synced: number }> {
    if (!this.botCatalog.usesDedicatedPool()) return { created: 0, synced: 0 };

    const slots = slotsForToken(symbol);
    let created = 0;
    let synced = 0;

    for (const s of slots) {
      try {
        const r = await this.ensureBotUser(s.email, s.kind);
        if (r.created) created++;
        if (r.inventorySynced) synced++;
      } catch (err) {
        this.logger.warn(
          `ensureBotsForToken ${symbol} slot ${s.slot}: ${(err as Error).message}`,
        );
      }
    }

    if (created > 0 || synced > 0) {
      await this.botCatalog.reload();
      this.logger.log(
        `ensureBotsForToken ${symbol}: ${created} bot mới, ${synced} synced`,
      );
    }

    return { created, synced };
  }

  /** Tương đương `node scripts/ensure-liquidity-bots.js` — dùng khi không có Render Shell. */
  async ensureAllLiquidityBots(): Promise<{
    mm: LiquidityBotEnsureResult[];
    flow: LiquidityBotEnsureResult[];
  }> {
    await this.botCatalog.reload();
    const mm: LiquidityBotEnsureResult[] = [];
    const flow: LiquidityBotEnsureResult[] = [];

    if (this.botCatalog.usesDedicatedPool()) {
      for (const g of this.botCatalog.getTokenGroups()) {
        for (const s of g.slots) {
          const r = await this.ensureBotUser(s.email, s.kind);
          if (s.kind === 'mm') mm.push(r);
          else flow.push(r);
        }
      }
    } else {
      for (const email of this.botCatalog.getMmEmails()) {
        mm.push(await this.ensureBotUser(email, 'mm'));
      }
      for (const email of this.botCatalog.getFlowEmails()) {
        flow.push(await this.ensureBotUser(email, 'flow'));
      }
    }

    const created =
      mm.filter((r) => r.created).length + flow.filter((r) => r.created).length;
    this.logger.log(
      `Liquidity bootstrap: ${mm.length} MM, ${flow.length} flow (${created} mới) — ${this.botCatalog.usesDedicatedPool() ? '10 bot/token' : 'pool legacy'}`,
    );

    return { mm, flow };
  }
}
