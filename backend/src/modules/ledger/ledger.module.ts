import { UserRepository } from '@modules/user/user.repository';
import { Module } from '@nestjs/common';
import { LedgerController } from './ledger.controller';
import { LedgerService } from './ledger.service';

@Module({
  controllers: [LedgerController],
  providers: [LedgerService, UserRepository],
  exports: [LedgerService],
})
export class LedgerModule {}
