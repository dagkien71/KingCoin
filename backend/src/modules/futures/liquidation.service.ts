import { FuturesEngineService } from '@modules/futures/futures-engine.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class LiquidationService {
  private readonly logger = new Logger(LiquidationService.name);

  constructor(private readonly engine: FuturesEngineService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async scan(): Promise<void> {
    try {
      const n = await this.engine.checkLiquidations();
      const tpSl = await this.engine.checkTpSlTriggers();
      if (n > 0) {
        this.logger.warn(`Đã thanh lý ${n} vị thế futures`);
      }
      if (tpSl > 0) {
        this.logger.log(`Đã đóng ${tpSl} vị thế theo TP/SL`);
      }
    } catch (e) {
      this.logger.error('Liquidation scan failed', e);
    }
  }
}
