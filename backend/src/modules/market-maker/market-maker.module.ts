import { CaslModule } from '@modules/casl';
import { OrderModule } from '@modules/order/order.module';
import { RealtimeModule } from '@modules/realtime/realtime.module';
import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { Module, forwardRef } from '@nestjs/common';
import { BotInventoryModule } from './bot-inventory.module';
import { permissions } from './market-maker.permissions';
import { LiquidityOrdersAdminController } from './liquidity-orders-admin.controller';
import { LiquidityOrdersAdminService } from './liquidity-orders-admin.service';
import { MmBotsAdminController } from './mm-bots-admin.controller';
import { MmBotRegistryService } from './mm-bot-registry.service';
import { MmLiquidityBootstrapService } from './mm-liquidity-bootstrap.service';
import { MarketControlAdminController } from './market-control-admin.controller';
import { MarketSettingsAdminController } from './market-settings-admin.controller';
import { PlatformLiquiditySettingsService } from './platform-liquidity-settings.service';
import { VolatilityTransitionService } from './volatility-transition.service';
import { MarketFlowService } from './market-flow.service';
import { MarketMakerService } from './market-maker.service';
import { MmControlService } from './mm-control.service';
import { MmInstantFillService } from './mm-instant-fill.service';
import { OrderbookPathService } from './orderbook-path.service';
import { UserBotService } from './user-bot.service';
import { LiquidityBotRebalanceService } from './liquidity-bot-rebalance.service';

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
    LiquidityOrdersAdminController,
  ],
  providers: [
    VolatilityTransitionService,
    PlatformLiquiditySettingsService,
    MmBotRegistryService,
    MmLiquidityBootstrapService,
    LiquidityOrdersAdminService,
    MmControlService,
    MarketMakerService,
    MarketFlowService,
    UserBotService,
    MmInstantFillService,
    OrderbookPathService,
    LiquidityBotRebalanceService,
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
