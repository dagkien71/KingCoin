import { LedgerModule } from '@modules/ledger/ledger.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [UserModule, LedgerModule, NotificationModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
