import { LedgerModule } from '@modules/ledger/ledger.module';
import { FeesModule } from '@modules/fees/fees.module';
import { OrderModule } from '@modules/order/order.module';
import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { UserModule } from '@modules/user/user.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { Module } from '@nestjs/common';
import { FuturesController } from './futures.controller';
import { FuturesConfigService } from './futures-config.service';
import { FuturesEngineService } from './futures-engine.service';
import { FuturesFundingService } from './futures-funding.service';
import { LiquidationService } from './liquidation.service';
import { MarkPriceService } from './mark-price.service';

@Module({
  imports: [
    TokenCryptoModule,
    LedgerModule,
    FeesModule,
    UserModule,
    OrderModule,
    NotificationModule,
  ],
  controllers: [FuturesController],
  providers: [
    MarkPriceService,
    FuturesConfigService,
    FuturesEngineService,
    FuturesFundingService,
    LiquidationService,
  ],
  exports: [FuturesEngineService, MarkPriceService],
})
export class FuturesModule {}
