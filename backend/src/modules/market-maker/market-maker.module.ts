import { CaslModule } from '@modules/casl';
import { OrderModule } from '@modules/order/order.module';
import { RealtimeModule } from '@modules/realtime/realtime.module';
import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { Module, forwardRef } from '@nestjs/common';
import { BotInventoryModule } from './bot-inventory.module';
import { permissions } from './market-maker.permissions';
import { MarketControlAdminController } from './market-control-admin.controller';
import { MarketFlowService } from './market-flow.service';
import { MarketMakerService } from './market-maker.service';
import { MmControlService } from './mm-control.service';
import { MmInstantFillService } from './mm-instant-fill.service';

@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    forwardRef(() => OrderModule),
    TokenCryptoModule,
    RealtimeModule,
    BotInventoryModule,
  ],
  controllers: [MarketControlAdminController],
  providers: [
    MmControlService,
    MarketMakerService,
    MarketFlowService,
    MmInstantFillService,
  ],
  exports: [MmInstantFillService, MmControlService, MarketMakerService],
})
export class MarketMakerModule {}
