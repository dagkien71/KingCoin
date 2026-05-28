import { isQuoteToken } from '@modules/market-maker/liquidity-target-tokens.util';
import {
  flowLiquidityEmails as legacyFlowEmails,
  mmLiquidityEmails as legacyMmEmails,
} from '@modules/market-maker/liquidity-bots.util';
import {
  BOTS_PER_TOKEN,
  DedicatedBotSlot,
  DedicatedTokenBots,
  dedicatedKindFromEmail,
  isDedicatedBotEmail,
  isLegacyBotPool,
  parseDedicatedBotEmail,
  sanitizeSymbolKey,
  slotsForToken,
} from '@modules/market-maker/token-dedicated-bots.util';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';

export type TokenBotAssignment = {
  tokenId: string;
  tokenName: string;
  symbol: string;
};

@Injectable()
export class TokenDedicatedBotsCatalogService implements OnModuleInit {
  private readonly logger = new Logger(TokenDedicatedBotsCatalogService.name);

  private tokenGroups: DedicatedTokenBots[] = [];
  private mmEmails: string[] = [];
  private flowEmails: string[] = [];
  private allEmails: string[] = [];
  private emailAssignment = new Map<string, TokenBotAssignment>();
  private ready: Promise<void> = Promise.resolve();

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.ready = this.reload();
  }

  /** Chờ catalog load token + email bot (tránh MM chạy khi danh sách còn rỗng). */
  whenReady(): Promise<void> {
    return this.ready;
  }

  usesDedicatedPool(): boolean {
    return !isLegacyBotPool();
  }

  async reload(): Promise<void> {
    const run = this.doReload();
    this.ready = run;
    return run;
  }

  private async doReload(): Promise<void> {
    if (isLegacyBotPool()) {
      this.mmEmails = legacyMmEmails();
      this.flowEmails = legacyFlowEmails();
      this.allEmails = [...new Set([...this.mmEmails, ...this.flowEmails])];
      this.tokenGroups = [];
      this.emailAssignment.clear();
      this.logger.log(
        `Bot pool legacy: ${this.mmEmails.length} MM, ${this.flowEmails.length} flow`,
      );
      return;
    }

    const tokens = await this.prisma.tokenCrypto.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, symbol: true, tokenKind: true },
      orderBy: { rank: 'asc' },
    });
    const base = tokens.filter(
      (t) => t.id && t.name && t.symbol && !isQuoteToken(t),
    );

    const groups: DedicatedTokenBots[] = [];
    const mm: string[] = [];
    const flow: string[] = [];
    const assign = new Map<string, TokenBotAssignment>();

    for (const t of base) {
      const symbol = t.symbol!;
      const slots = slotsForToken(symbol);
      groups.push({
        tokenId: t.id,
        tokenName: t.name!,
        symbol,
        slots,
      });
      for (const s of slots) {
        const a = {
          tokenId: t.id,
          tokenName: t.name!,
          symbol,
        };
        assign.set(s.email.toLowerCase(), a);
        if (s.kind === 'mm') mm.push(s.email);
        else flow.push(s.email);
      }
    }

    this.tokenGroups = groups;
    this.mmEmails = mm;
    this.flowEmails = flow;
    this.allEmails = [...new Set([...mm, ...flow])];
    this.emailAssignment = assign;

    this.logger.log(
      `Bot pool dedicated: ${base.length} token × ${BOTS_PER_TOKEN} = ${this.allEmails.length} bot (${mm.length} MM + ${flow.length} flow)`,
    );
  }

  getTokenGroups(): DedicatedTokenBots[] {
    return this.tokenGroups;
  }

  getMmEmails(): string[] {
    return [...this.mmEmails];
  }

  getFlowEmails(): string[] {
    return [...this.flowEmails];
  }

  getAllEmails(): string[] {
    return [...this.allEmails];
  }

  getAssignment(email: string): TokenBotAssignment | null {
    return this.emailAssignment.get(email.trim().toLowerCase()) ?? null;
  }

  getSlotsForTokenId(tokenId: string): DedicatedBotSlot[] {
    const g = this.tokenGroups.find((x) => x.tokenId === tokenId);
    return g?.slots ?? [];
  }

  getMmEmailsForToken(tokenId: string): string[] {
    return this.getSlotsForTokenId(tokenId)
      .filter((s) => s.kind === 'mm')
      .map((s) => s.email);
  }

  getFlowEmailsForToken(tokenId: string): string[] {
    return this.getSlotsForTokenId(tokenId)
      .filter((s) => s.kind === 'flow')
      .map((s) => s.email);
  }

  isKnownBotEmail(email: string): boolean {
    if (this.usesDedicatedPool()) {
      return this.emailAssignment.has(email.trim().toLowerCase());
    }
    const e = email.trim().toLowerCase();
    return (
      this.mmEmails.some((x) => x.toLowerCase() === e) ||
      this.flowEmails.some((x) => x.toLowerCase() === e)
    );
  }

  kindForEmail(email: string): 'mm' | 'flow' | null {
    if (this.usesDedicatedPool()) {
      return dedicatedKindFromEmail(email);
    }
    const e = email.trim().toLowerCase();
    if (this.mmEmails.some((x) => x.toLowerCase() === e)) return 'mm';
    if (this.flowEmails.some((x) => x.toLowerCase() === e)) return 'flow';
    return null;
  }

  async resolveTokenForBotEmail(email: string) {
    if (this.usesDedicatedPool()) {
      const a = this.getAssignment(email);
      if (!a) return null;
      return this.prisma.tokenCrypto.findUnique({
        where: { id: a.tokenId },
      });
    }
    const parsed = parseDedicatedBotEmail(email);
    if (!parsed) return null;
    const tokens = await this.prisma.tokenCrypto.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, symbol: true, tokenKind: true },
    });
    const match = tokens.find(
      (t) =>
        t.symbol &&
        !isQuoteToken(t) &&
        sanitizeSymbolKey(t.symbol) === parsed.symbolKey,
    );
    return match ?? null;
  }
}
