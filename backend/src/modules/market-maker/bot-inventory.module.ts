import { Module } from '@nestjs/common';
import { BotInventoryService } from './bot-inventory.service';
import { MmLiquidityBootstrapService } from './mm-liquidity-bootstrap.service';
import { TokenDedicatedBotsCatalogService } from './token-dedicated-bots-catalog.service';

@Module({
  providers: [
    TokenDedicatedBotsCatalogService,
    BotInventoryService,
    MmLiquidityBootstrapService,
  ],
  exports: [
    TokenDedicatedBotsCatalogService,
    BotInventoryService,
    MmLiquidityBootstrapService,
  ],
})
export class BotInventoryModule {}
