import { assertPositiveSpotPrice } from '../../common/spot-price.util';
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { TokenCryptoLogRepository } from './token-log.repository';

@Injectable()
export class TokenCryptoLogService {
  constructor(private readonly logRepository: TokenCryptoLogRepository) {}

  // Helper method to generate log hash
  private generateLogHash(
    price: number,
    volume: number,
    timestamp: Date,
  ): string {
    const data = `${price}|${volume}|${timestamp.toISOString()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async createLog(tokenId: string, price: number, volume: number) {
    const safePrice = assertPositiveSpotPrice(price, 'Giá log');
    const timestamp = new Date(Date.now());
    const hash = this.generateLogHash(price, volume, timestamp);

    const data = {
      price: safePrice,
      volume,
      timestamp,
      hash,
      token: {
        connect: {
          id: tokenId,
        },
      },
    };

    try {
      return await this.logRepository.create(data);
    } catch (error) {
      console.error('Error creating log:', error);
      throw error;
    }
  }

  async verifyLog(logId: string): Promise<boolean> {
    const log = await this.logRepository.findById(logId);
    if (!log) return false;

    const computedHash = this.generateLogHash(
      log.price,
      log.volume,
      log.timestamp,
    );
    return computedHash === log.hash;
  }

  async getLogsByToken(tokenId: string, options?: { limit?: number }) {
    const limit = options?.limit ?? 2500;
    const logs = await this.logRepository.findMany({
      where: { tokenId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    const formattedLogs = [...logs].reverse().map((log) => ({
      ...log,
      timestamp: new Date(log.timestamp).getTime(),
    }));

    return formattedLogs;
  }

  async getVolumes(tokenId: string) {
    const now = new Date();

    const past1h = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const past1w = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const past1m = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const past1y = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [volume1h, volume24h, volume1w, volume1m, volume1y] =
      await Promise.all([
        this.getVolumeWithinPeriod(tokenId, past1h),
        this.getVolumeWithinPeriod(tokenId, past24h),
        this.getVolumeWithinPeriod(tokenId, past1w),
        this.getVolumeWithinPeriod(tokenId, past1m),
        this.getVolumeWithinPeriod(tokenId, past1y),
      ]);

    return {
      tokenId,
      volume1h,
      volume24h,
      volume1w,
      volume1m,
      volume1y,
    };
  }

  /**
   * Giá tham chiếu tại hoặc trước `at` — dùng cho % 1h/24h/7d.
   * @see docs/PRICE_CHANGE_PCT_SPEC.md
   */
  async getPriceAtOrBefore(
    tokenId: string,
    at: Date,
  ): Promise<number | null> {
    const earliest = await this.logRepository.findFirst({
      where: { tokenId },
      orderBy: { timestamp: 'asc' },
    });
    if (!earliest?.timestamp || earliest.timestamp > at) {
      return null;
    }

    const atOrBefore = await this.logRepository.findFirst({
      where: { tokenId, timestamp: { lte: at } },
      orderBy: { timestamp: 'desc' },
    });
    if (atOrBefore?.price != null && atOrBefore.price > 0) {
      return atOrBefore.price;
    }

    return earliest.price > 0 ? earliest.price : null;
  }

  private async getVolumeWithinPeriod(tokenId: string, startTime: Date) {
    const logs = await this.logRepository.findMany({
      where: {
        tokenId,
        timestamp: {
          gte: startTime,
        },
      },
    });

    return logs.reduce((sum, log) => sum + log.volume, 0);
  }
}
