import { SkipAuth } from '@modules/auth/skip-auth.guard';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import UserEntity from '@modules/user/entities/user.entity';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { Request } from 'express';
import CommentEntity from './entities/comment.entity';
import { CommentHook } from './comment.hook';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentService } from './comment.service';

@ApiTags('Comments')
@ApiBaseResponses()
@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('token-crypto/:tokenId/comments')
  @SkipAuth()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async list(
    @Param('tokenId') tokenId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Req() req?: Request & { user?: User },
  ) {
    const parsedLimit = limit != null ? Number.parseInt(limit, 10) : undefined;
    return this.commentService.listByToken(
      tokenId,
      {
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        cursor,
      },
      req?.user ?? null,
    );
  }

  @Post('token-crypto/:tokenId/comments')
  @Throttle(10, 60)
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async create(
    @Param('tokenId') tokenId: string,
    @Body() dto: CreateCommentDto,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.commentService.create(tokenId, user.id, dto);
  }

  @Delete('comments/:id')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.delete, CommentEntity, CommentHook)
  async remove(
    @Param('id') id: string,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.commentService.remove(id, user);
  }
}
