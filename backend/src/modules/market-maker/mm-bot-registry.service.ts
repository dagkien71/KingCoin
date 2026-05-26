import { MmControlService } from '@modules/market-maker/mm-control.service';
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

  async getAdminDashboard(): Promise<{
    globalMmEnabled: boolean;
    globalFlowEnabled: boolean;
    envMmEnabled: boolean;
    bots: MmBotAdminRow[];
  }> {
    const { mm, flow } = this.configuredEmails();
    const allEmails = [...new Set([...mm, ...flow])];
    const users = await this.prisma.user.findMany({
      where: { email: { in: allEmails } },
      select: {
        id: true,
        email: true,
        username: true,
        balance: {
          select: {
            tokens: {
              select: {
                amount: true,
                token: { select: { symbol: true, tokenKind: true } },
              },
            },
          },
        },
      },
    });
    const byEmail = new Map(users.map((u) => [u.email.toLowerCase(), u]));

    const pendingGroups = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { in: users.map((u) => u.id) },
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
      let kcBalance = 0;
      let baseTokenKinds = 0;
      if (user?.balance?.tokens) {
        for (const t of user.balance.tokens) {
          const sym = (t.token?.symbol ?? '').toUpperCase();
          const kindTok = t.token?.tokenKind;
          if (sym === 'KC' || kindTok === 'stablecoin') {
            kcBalance += Number(t.amount ?? 0);
          } else {
            baseTokenKinds += 1;
          }
        }
      }
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

    return {
      globalMmEnabled: this.mmControl.isMmEnabled(),
      globalFlowEnabled: this.mmControl.isFlowEnabled(),
      envMmEnabled: process.env.MARKET_MAKER_ENABLED === 'true',
      bots,
    };
  }
}
