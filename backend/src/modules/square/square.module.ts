import { CaslModule } from '@modules/casl';
import { FuturesModule } from '@modules/futures/futures.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { OrderModule } from '@modules/order/order.module';
import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { SquareController } from './square.controller';
import { SquareRepository } from './square.repository';
import { SquareService } from './square.service';

@Module({
  imports: [
    CaslModule.forFeature({ permissions: [] }),
    UserModule,
    OrderModule,
    TokenCryptoModule,
    FuturesModule,
    NotificationModule,
  ],
  controllers: [SquareController],
  providers: [SquareService, SquareRepository],
  exports: [SquareService, SquareRepository],
})
export class SquareModule {}
