import { isFuturesEligibleToken } from '@modules/futures/futures-eligible.util';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FuturesConfig, TokenCrypto } from '@prisma/client';
import { PrismaService } from '@providers/prisma';

const DEFAULTS = {
  enabled: true,
  maxLeverage: 10,
  minMarginKc: 10,
  minSize: 0.0001,
  maintenanceRate: 0.005,
  liquidationFeeRate: 0.002,
  openFeeRate: 0.0004,
  closeFeeRate: 0.0004,
  fundingRate: 0.0001,
};

export type FuturesMarketRow = TokenCrypto & { futures: FuturesConfig };

@Injectable()
export class FuturesConfigService implements OnModuleInit {
  private readonly logger = new Logger(FuturesConfigService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      const n = await this.syncSpotFuturesMarkets();
      if (n > 0) {
        this.logger.log(`Futures: đã đồng bộ ${n} cặp từ spot.`);
      }
    } catch (e) {
      this.logger.warn('Futures sync spot markets skipped', e);
    }
  }

  async getForToken(tokenId: string): Promise<FuturesConfig> {
    const token = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
    });
    if (!token || !isFuturesEligibleToken(token)) {
      const row = await this.prisma.futuresConfig.findUnique({
        where: { tokenId },
      });
      if (row) return row;
      return this.prisma.futuresConfig.create({
        data: { tokenId, ...DEFAULTS, enabled: false },
      });
    }
    return this.ensureConfig(tokenId);
  }

  /** Bật FuturesConfig cho mọi alt đang có trên spot (cùng DB với /token-crypto/all). */
  async syncSpotFuturesMarkets(): Promise<number> {
    const tokens = await this.prisma.tokenCrypto.findMany({
      orderBy: [{ rank: 'asc' }, { symbol: 'asc' }],
    });
    let count = 0;
    for (const t of tokens) {
      if (!isFuturesEligibleToken(t)) continue;
      await this.ensureConfig(t.id);
      count += 1;
    }
    return count;
  }

  async listSpotMarkets(): Promise<FuturesMarketRow[]> {
    await this.syncSpotFuturesMarkets();
    const tokens = await this.prisma.tokenCrypto.findMany({
      orderBy: [{ rank: 'asc' }, { symbol: 'asc' }],
    });
    const eligible = tokens.filter(isFuturesEligibleToken);
    const configs = await this.prisma.futuresConfig.findMany({
      where: {
        tokenId: { in: eligible.map((t) => t.id) },
        enabled: true,
      },
    });
    const byToken = new Map(configs.map((c) => [c.tokenId, c]));
    return eligible
      .map((t) => {
        const futures = byToken.get(t.id);
        if (!futures) return null;
        return { ...t, futures };
      })
      .filter((r): r is FuturesMarketRow => r != null);
  }

  private async ensureConfig(tokenId: string): Promise<FuturesConfig> {
    return this.prisma.futuresConfig.upsert({
      where: { tokenId },
      create: { tokenId, ...DEFAULTS },
      update: { enabled: true },
    });
  }
}
