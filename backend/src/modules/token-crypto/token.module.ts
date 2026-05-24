import { CaslModule } from '@modules/casl';
import { LedgerModule } from '@modules/ledger/ledger.module';
import { BotInventoryModule } from '@modules/market-maker/bot-inventory.module';
import { UserRepository } from '@modules/user/user.repository';
import { permissions } from '@modules/token-crypto/token.permissions';
import { TokenCryptoRepository } from '@modules/token-crypto/token.repository';
import { NotificationModule } from '@modules/notification/notification.module';
import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TokenCryptoAdminController } from './token-admin.controller';
import { TokenCryptoAgentController } from './token-agent.controller';
import { TokenCryptoController } from './token.controller';
import { TokenCryptoService } from './token.service';
import { TokenPriceCronJobService } from './token-price-cronjob.service';
import { TokenCryptoLogController } from './token-log.controller';
import { TokenCryptoLogService } from './token-log.service';
import { TokenCryptoLogRepository } from './token-log.repository';
import { UpcomingListingRepository } from './upcoming-listing.repository';
import { UpcomingListingService } from './upcoming-listing.service';
import { ListingRequestRepository } from './listing-request.repository';
import { ListingRequestService } from './listing-request.service';
import { ListingRequestController } from './listing-request.controller';
import { ListingRequestAdminController } from './listing-request-admin.controller';
import { UpcomingListingController } from './upcoming-listing.controller';
import { ListingGoLiveCronService } from './listing-go-live-cron.service';

@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    ScheduleModule.forRoot(),
    LedgerModule,
    BotInventoryModule,
    forwardRef(() => NotificationModule),
  ],
  controllers: [
    TokenCryptoAdminController,
    TokenCryptoAgentController,
    TokenCryptoController,
    TokenCryptoLogController,
    ListingRequestController,
    ListingRequestAdminController,
    UpcomingListingController,
  ],
  providers: [
    TokenCryptoService,
    TokenCryptoRepository,
    UserRepository,
    TokenPriceCronJobService,
    TokenCryptoLogService,
    TokenCryptoLogRepository,
    UpcomingListingRepository,
    UpcomingListingService,
    ListingRequestRepository,
    ListingRequestService,
    ListingGoLiveCronService,
  ],
  exports: [
    TokenCryptoService,
    TokenCryptoLogService,
    UpcomingListingService,
    ListingRequestService,
  ],
})
export class TokenCryptoModule {}
