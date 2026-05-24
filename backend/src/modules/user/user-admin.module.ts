import { FuturesModule } from '@modules/futures/futures.module';
import { LedgerModule } from '@modules/ledger/ledger.module';
import { CaslModule } from '@modules/casl';
import { Module, forwardRef } from '@nestjs/common';
import { permissions } from '@modules/user/user.permissions';
import { UserAdminController } from './user-admin.controller';
import { UserAdminInsightsService } from './user-admin-insights.service';
import { UserModule } from './user.module';

/** Tách khỏi UserModule để tránh vòng phụ thuộc UserModule ↔ FuturesModule. */
@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    UserModule,
    LedgerModule,
    forwardRef(() => FuturesModule),
  ],
  controllers: [UserAdminController],
  providers: [UserAdminInsightsService],
})
export class UserAdminModule {}
