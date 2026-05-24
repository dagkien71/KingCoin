import { CaslModule } from '@modules/casl';
import { TokenCryptoModule } from '@modules/token-crypto/token.module';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentHook } from './comment.hook';
import { permissions } from './comment.permissions';
import { CommentRepository } from './comment.repository';
import { CommentService } from './comment.service';

@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    TokenCryptoModule,
    UserModule,
  ],
  controllers: [CommentController],
  providers: [CommentService, CommentRepository, CommentHook],
  exports: [CommentService],
})
export class CommentModule {}
