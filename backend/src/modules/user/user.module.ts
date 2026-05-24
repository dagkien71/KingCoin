import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from '@modules/user/user.repository';
import { ReferralModule } from '@modules/referral/referral.module';
import { CaslModule } from '@modules/casl';
import { permissions } from '@modules/user/user.permissions';
import { UserAdminController } from './user-admin.controller';
import { PortfolioPnlService } from './portfolio-pnl.service';

@Module({
  imports: [CaslModule.forFeature({ permissions }), ReferralModule],
  controllers: [UserAdminController, UserController],
  providers: [UserService, UserRepository, PortfolioPnlService],
  exports: [UserRepository, PortfolioPnlService],
})
export class UserModule {}
