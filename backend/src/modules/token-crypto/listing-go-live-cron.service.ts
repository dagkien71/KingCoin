import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ListingRequestService } from './listing-request.service';

@Injectable()
export class ListingGoLiveCronService {
  private readonly logger = new Logger(ListingGoLiveCronService.name);

  constructor(private readonly listingRequestService: ListingRequestService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueListings() {
    try {
      const n = await this.listingRequestService.processDueGoLive();
      if (n > 0) {
        this.logger.log(`Go-live: ${n} token(s) niêm yết.`);
      }
    } catch (err) {
      this.logger.warn(`processDueListings: ${(err as Error).message}`);
    }
  }
}
