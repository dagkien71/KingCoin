import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenCryptoService } from './token.service';

@Injectable()
export class TokenPriceCronJobService {
  private readonly logger = new Logger(TokenPriceCronJobService.name);

  constructor(private readonly tokenCryptoService: TokenCryptoService) {}

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
    const tokens = await this.tokenCryptoService.findAllListed({});

    await Promise.all(
      (tokens?.data ?? []).map(async (token) => {
        try {
          await this.tokenCryptoService.syncVolumesFromLogs(token.id);
        } catch (err) {
          this.logger.warn(
            `syncVolumes failed for ${token.id}: ${(err as Error).message}`,
          );
        }
      }),
    );
  }
}
