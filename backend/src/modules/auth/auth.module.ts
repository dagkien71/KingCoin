import { MailModule } from '@modules/mail/mail.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthTokenRepository } from './auth-token.repository';
import { UserRepository } from '@modules/user/user.repository';
import { TokenService } from '@modules/auth/token.service';
import { TokenRepository } from '@modules/auth/token.repository';
import { ReferralModule } from '@modules/referral/referral.module';
import { CaslModule } from '@modules/casl';
import { permissions } from '@modules/auth/auth.permissions';

@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    ReferralModule,
    NotificationModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    UserRepository,
    TokenRepository,
    AuthTokenRepository,
  ],
})
export class AuthModule {}
