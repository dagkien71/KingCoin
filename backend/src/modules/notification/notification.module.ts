import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { Module, forwardRef } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationJobsService } from './notification-jobs.service';
import { NotificationService } from './notification.service';
import { PriceAlertService } from './price-alert.service';
import { WebPushService } from './web-push.service';

@Module({
  imports: [forwardRef(() => TokenCryptoModule)],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    WebPushService,
    PriceAlertService,
    NotificationJobsService,
  ],
  exports: [NotificationService, PriceAlertService],
})
export class NotificationModule {}
