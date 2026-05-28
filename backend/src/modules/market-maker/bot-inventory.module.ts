import { Module } from '@nestjs/common';
import { BotInventoryService } from './bot-inventory.service';
import { TokenDedicatedBotsCatalogService } from './token-dedicated-bots-catalog.service';

@Module({
  providers: [TokenDedicatedBotsCatalogService, BotInventoryService],
  exports: [TokenDedicatedBotsCatalogService, BotInventoryService],
})
export class BotInventoryModule {}
