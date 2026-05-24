import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenCryptoService } from './token.service';
import { TokenCryptoLogService } from './token-log.service';

interface TokenVolumes {
  volume1h: number;
  volume24h: number;
  volume1w: number;
  volume1m: number;
  volume1y: number;
}

@Injectable()
export class TokenPriceCronJobService {
  private readonly logger = new Logger(TokenPriceCronJobService.name);

  constructor(
    private readonly tokenCryptoService: TokenCryptoService,
    private readonly tokenCryptoLogService: TokenCryptoLogService,
  ) {}

  /** % 1h / 24h / 7d từ log giá — @see docs/PRICE_CHANGE_PCT_SPEC.md */
  @Cron('*/60 * * * * *')
  async syncPriceChangePercentsJob() {
    try {
      await this.tokenCryptoService.syncAllPriceChangePercents();
    } catch (err) {
      this.logger.warn(
        `syncPriceChangePercents: ${(err as Error).message}`,
      );
    }
  }

  /** Đồng bộ volume từ log giao dịch thật (khớp lệnh / MM), không mô phỏng ngẫu nhiên */
  @Cron(CronExpression.EVERY_HOUR)
  async syncVolumesFromTradeLogs() {
    const tokens = await this.tokenCryptoService.findAll({});

    await Promise.all(
      (tokens?.data ?? []).map(async (token) => {
        try {
          const volumes =
            await this.tokenCryptoLogService.getVolumes(token.id);
          const payload: TokenVolumes = {
            volume1h: volumes.volume1h,
            volume24h: volumes.volume24h,
            volume1w: volumes.volume1w,
            volume1m: volumes.volume1m,
            volume1y: volumes.volume1y,
          };
          await this.tokenCryptoService.update(token.id, {
            volumes: payload as unknown as Record<string, number>,
          });
        } catch (err) {
          this.logger.warn(
            `syncVolumes failed for ${token.id}: ${(err as Error).message}`,
          );
        }
      }),
    );
  }
}
