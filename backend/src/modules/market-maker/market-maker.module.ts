import { CaslModule } from '@modules/casl';
import { OrderModule } from '@modules/order/order.module';
import { RealtimeModule } from '@modules/realtime/realtime.module';
import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { Module, forwardRef } from '@nestjs/common';
import { BotInventoryModule } from './bot-inventory.module';
import { permissions } from './market-maker.permissions';
import { MmBotsAdminController } from './mm-bots-admin.controller';
import { MmBotRegistryService } from './mm-bot-registry.service';
import { MmLiquidityBootstrapService } from './mm-liquidity-bootstrap.service';
import { MarketControlAdminController } from './market-control-admin.controller';
import { MarketSettingsAdminController } from './market-settings-admin.controller';
import { PlatformLiquiditySettingsService } from './platform-liquidity-settings.service';
import { MarketFlowService } from './market-flow.service';
import { MarketMakerService } from './market-maker.service';
import { MmControlService } from './mm-control.service';
import { MmInstantFillService } from './mm-instant-fill.service';
import { OrderbookPathService } from './orderbook-path.service';

@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    forwardRef(() => OrderModule),
    TokenCryptoModule,
    RealtimeModule,
    BotInventoryModule,
  ],
  controllers: [
    MarketControlAdminController,
    MarketSettingsAdminController,
    MmBotsAdminController,
  ],
  providers: [
    PlatformLiquiditySettingsService,
    MmBotRegistryService,
    MmLiquidityBootstrapService,
    MmControlService,
    MarketMakerService,
    MarketFlowService,
    MmInstantFillService,
    OrderbookPathService,
  ],
  exports: [
    PlatformLiquiditySettingsService,
    MmBotRegistryService,
    MmInstantFillService,
    MmControlService,
    MarketMakerService,
    OrderbookPathService,
  ],
})
export class MarketMakerModule {}
