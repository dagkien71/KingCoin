import { MmControlService } from '@modules/market-maker/mm-control.service';
import {
  buildMmEnvDiagnostics,
  envMmEnabledFromProcess,
} from '@modules/market-maker/mm-env.util';
import {
  flowLiquidityEmails,
  mmLiquidityEmails,
} from '@modules/market-maker/liquidity-bots.util';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';

export type MmBotKind = 'mm' | 'flow';

export type MmBotOverride = {
  enabled?: boolean;
};

export type MmBotRuntimeStats = {
  lastRefreshAt: number | null;
  lastRefreshOk: boolean;
  lastError: string | null;
  refreshCount: number;
};

export type MmBotAdminRow = {
  userId: string;
  email: string;
  username: string | null;
  kind: MmBotKind;
  configured: boolean;
  enabled: boolean;
  running: boolean;
  pendingOrders: number;
  kcBalance: number;
  baseTokenKinds: number;
  lastRefreshAt: number | null;
  lastRefreshOk: boolean;
  lastError: string | null;
  refreshCount: number;
};

@Injectable()
export class MmBotRegistryService {
  private readonly overrides = new Map<string, MmBotOverride>();
  private readonly stats = new Map<string, MmBotRuntimeStats>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mmControl: MmControlService,
  ) {}

  private key(email: string): string {
    return email.trim().toLowerCase();
  }

  isBotEnabled(email: string, kind: MmBotKind): boolean {
    const ov = this.overrides.get(this.key(email));
    if (ov?.enabled === false) return false;
    if (kind === 'mm' && !this.mmControl.isMmEnabled()) return false;
    if (kind === 'flow' && !this.mmControl.isFlowEnabled()) return false;
    return true;
  }

  patchBot(email: string, dto: MmBotOverride): MmBotOverride {
    const k = this.key(email);
    const cur = this.overrides.get(k) ?? {};
    const next = { ...cur, ...dto };
    if (next.enabled === undefined) {
      delete next.enabled;
    }
    if (Object.keys(next).length === 0) {
      this.overrides.delete(k);
    } else {
      this.overrides.set(k, next);
    }
    return { ...next };
  }

  getOverride(email: string): MmBotOverride {
    return { ...(this.overrides.get(this.key(email)) ?? {}) };
  }

  recordRefresh(userId: string, ok: boolean, error?: string): void {
    const prev = this.stats.get(userId) ?? {
      lastRefreshAt: null,
      lastRefreshOk: true,
      lastError: null,
      refreshCount: 0,
    };
    this.stats.set(userId, {
      lastRefreshAt: Date.now(),
      lastRefreshOk: ok,
      lastError: ok ? null : (error ?? 'Lỗi không xác định'),
      refreshCount: prev.refreshCount + 1,
    });
  }

  getStats(userId: string): MmBotRuntimeStats {
    return (
      this.stats.get(userId) ?? {
        lastRefreshAt: null,
        lastRefreshOk: true,
        lastError: null,
        refreshCount: 0,
      }
    );
  }

  async cancelPendingOrdersForUser(userId: string, tokenId?: string): Promise<number> {
    const del = await this.prisma.order.deleteMany({
      where: {
        userId,
        status: 'pending',
        ...(tokenId ? { tokenId } : {}),
      },
    });
    return del.count;
  }

  configuredEmails(): { mm: string[]; flow: string[] } {
    return {
      mm: mmLiquidityEmails(),
      flow: flowLiquidityEmails(),
    };
  }

  private async getQuoteTokenId(): Promise<string | null> {
    const quoteName = process.env.QUOTE_TOKEN_NAME ?? 'KingCoin';
    const quote = await this.prisma.tokenCrypto.findFirst({
      where: { name: quoteName },
      select: { id: true },
    });
    return quote?.id ?? null;
  }

  private sumKcAndCountBase(
    balance:
      | {
          stableCoin?: number;
          tokens?: { tokenId: string; amount: number }[];
        }
      | null
      | undefined,
    quoteId: string | null,
  ): { kcBalance: number; baseTokenKinds: number } {
    if (!balance) return { kcBalance: 0, baseTokenKinds: 0 };
    let kcBalance = balance.stableCoin ?? 0;
    let baseTokenKinds = 0;
    for (const t of balance.tokens ?? []) {
      if (!t.tokenId || (t.amount ?? 0) <= 1e-12) continue;
      if (quoteId && t.tokenId === quoteId) {
        kcBalance += Number(t.amount ?? 0);
      } else {
        baseTokenKinds += 1;
      }
    }
    return { kcBalance, baseTokenKinds };
  }

  async getAdminDashboard(): Promise<{
    globalMmEnabled: boolean;
    globalFlowEnabled: boolean;
    envMmEnabled: boolean;
    adminOverrideMmEnabled: boolean | null;
    adminOverrideFlowEnabled: boolean | null;
    diagnostics: ReturnType<typeof buildMmEnvDiagnostics>;
    bots: MmBotAdminRow[];
  }> {
    const { mm, flow } = this.configuredEmails();
    const quoteId = await this.getQuoteTokenId();

    const users =
      mm.length + flow.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { email: { in: [...new Set([...mm, ...flow])] } },
            select: {
              id: true,
              email: true,
              username: true,
              balance: {
                select: {
                  stableCoin: true,
                  tokens: {
                    select: { tokenId: true, amount: true },
                  },
                },
              },
            },
          });
    const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    const userIds = users.map((u) => u.id);
    const pendingGroups =
      userIds.length === 0
        ? []
        : await this.prisma.order.groupBy({
            by: ['userId'],
            where: {
              userId: { in: userIds },
              status: 'pending',
            },
            _count: { _all: true },
          });
    const pendingByUser = new Map(
      pendingGroups.map((g) => [g.userId, g._count._all]),
    );

    const buildRow = (
      email: string,
      kind: MmBotKind,
      configured: boolean,
    ): MmBotAdminRow => {
      const user = byEmail.get(email.toLowerCase());
      const ov = this.getOverride(email);
      const enabled = ov.enabled !== false;
      const running = configured && enabled && this.isBotEnabled(email, kind);
      const stats = user ? this.getStats(user.id) : null;
      const { kcBalance, baseTokenKinds } = this.sumKcAndCountBase(
        user?.balance,
        quoteId,
      );
      return {
        userId: user?.id ?? '',
        email,
        username: user?.username ?? null,
        kind,
        configured: !!user && configured,
        enabled,
        running,
        pendingOrders: user ? (pendingByUser.get(user.id) ?? 0) : 0,
        kcBalance,
        baseTokenKinds,
        lastRefreshAt: stats?.lastRefreshAt ?? null,
        lastRefreshOk: stats?.lastRefreshOk ?? true,
        lastError: stats?.lastError ?? null,
        refreshCount: stats?.refreshCount ?? 0,
      };
    };

    const bots: MmBotAdminRow[] = [
      ...mm.map((email) => buildRow(email, 'mm', true)),
      ...flow.map((email) => buildRow(email, 'flow', true)),
    ];

    const global = this.mmControl.getGlobalOverrideSnapshot();
    return {
      globalMmEnabled: this.mmControl.isMmEnabled(),
      globalFlowEnabled: this.mmControl.isFlowEnabled(),
      envMmEnabled: envMmEnabledFromProcess(),
      adminOverrideMmEnabled: global.mmEnabled ?? null,
      adminOverrideFlowEnabled: global.flowEnabled ?? null,
      diagnostics: buildMmEnvDiagnostics({ mm, flow }),
      bots,
    };
  }
}
