import { LedgerModule } from '@modules/ledger/ledger.module';
import { FeesModule } from '@modules/fees/fees.module';
import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { UserModule } from '@modules/user/user.module';
import { UserRepository } from '@modules/user/user.repository';
import { NotificationModule } from '@modules/notification/notification.module';
import { Module } from '@nestjs/common';
import { ConvertController } from './convert.controller';
import { ConvertService } from './convert.service';

@Module({
  imports: [TokenCryptoModule, LedgerModule, FeesModule, UserModule, NotificationModule],
  controllers: [ConvertController],
  providers: [ConvertService, UserRepository],
})
export class ConvertModule {}
