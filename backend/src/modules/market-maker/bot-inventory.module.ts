import { Module } from '@nestjs/common';
import { BotInventoryService } from './bot-inventory.service';

@Module({
  providers: [BotInventoryService],
  exports: [BotInventoryService],
})
export class BotInventoryModule {}
