import { LedgerModule } from '@modules/ledger/ledger.module';
import { FeesModule } from '@modules/fees/fees.module';
import { MarketMakerModule } from '@modules/market-maker/market-maker.module';
import { UserModule } from '@modules/user/user.module';
import { UserRepository } from '@modules/user/user.repository';
import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { Module, forwardRef } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';
import { TradeFillRepository } from './trade-fill.repository';

@Module({
  imports: [
    TokenCryptoModule,
    LedgerModule,
    FeesModule,
    UserModule,
    NotificationModule,
    forwardRef(() => MarketMakerModule),
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderRepository,
    TradeFillRepository,
    UserRepository,
  ],
  exports: [OrderService, OrderRepository, TradeFillRepository],
})
export class OrderModule {}
