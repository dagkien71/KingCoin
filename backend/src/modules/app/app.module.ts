import appConfig from '@config/app.config';
import jwtConfig from '@config/jwt.config';
import s3Config from '@config/s3.config';
import sqsConfig from '@config/sqs.config';
import swaggerConfig from '@config/swagger.config';
import { Roles } from '@modules/app/app.roles';
import { AuthGuard } from '@modules/auth/auth.guard';
import { AuthModule } from '@modules/auth/auth.module';
import { TokenRepository } from '@modules/auth/token.repository';
import { TokenService } from '@modules/auth/token.service';
import { CaslModule } from '@modules/casl';
import HealthModule from '@modules/health/health.module';
import { CommentModule } from '@modules/comment/comment.module';
import { ConvertModule } from '@modules/convert/convert.module';
import { FeesModule } from '@modules/fees/fees.module';
import { FuturesModule } from '@modules/futures/futures.module';
import { LedgerModule } from '@modules/ledger/ledger.module';
import { MarketMakerModule } from '@modules/market-maker/market-maker.module';
import { NotificationModule } from '@modules/notification/notification.module';
import { OrderModule } from '@modules/order/order.module';
import { RealtimeModule } from '@modules/realtime/realtime.module';
import { QuestModule } from '@modules/quest/quest.module';
import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { UploadModule } from '@modules/upload/upload.module';
import { UserModule } from '@modules/user/user.module';
import { UserAdminModule } from '@modules/user/user-admin.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { createUserMiddleware, loggingMiddleware } from '@providers/prisma';
import { PrismaModule } from '@providers/prisma/prisma.module';

@Module({
  controllers: [],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, swaggerConfig, jwtConfig, s3Config, sqsConfig],
    }),
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        middlewares: [loggingMiddleware(), createUserMiddleware()],
      },
    }),
    JwtModule.register({
      global: true,
    }),
    CaslModule.forRoot<Roles>({
      // Role to grant full access, optional
      superuserRole: Roles.admin,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 120,
    }),
    RealtimeModule,
    HealthModule,
    UploadModule,
    UserModule,
    UserAdminModule,
    AuthModule,
    TokenCryptoModule,
    OrderModule,
    LedgerModule,
    ConvertModule,
    FeesModule,
    FuturesModule,
    QuestModule,
    CommentModule,
    MarketMakerModule,
    NotificationModule,
  ],
  providers: [
    TokenService,
    JwtService,
    TokenRepository,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
