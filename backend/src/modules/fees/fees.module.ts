import { LedgerModule } from '@modules/ledger/ledger.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import { TradingFeeService } from './trading-fee.service';

@Module({
  imports: [LedgerModule, UserModule],
  controllers: [FeesController],
  providers: [TradingFeeService],
  exports: [TradingFeeService],
})
export class FeesModule {}
