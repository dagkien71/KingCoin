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
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { Request } from 'express';
import { CreateSquareConversationDto } from './dto/create-conversation.dto';
import { CreateSquareCommentDto } from './dto/create-square-comment.dto';
import { CreateSquarePostDto } from './dto/create-square-post.dto';
import { SendSquareMessageDto } from './dto/send-square-message.dto';
import { SetSquareReactionDto } from './dto/set-square-reaction.dto';
import { VoteSquarePollDto } from './dto/vote-square-poll.dto';
import { SquareService } from './square.service';

@ApiTags('Square')
@ApiBaseResponses()
@Controller('square')
export class SquareController {
  constructor(private readonly squareService: SquareService) {}

  @Get('feed')
  @SkipAuth()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async feed(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Req() req?: Request & { user?: User },
  ) {
    const parsedLimit = limit != null ? Number.parseInt(limit, 10) : undefined;
    return this.squareService.getFeed(
      {
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        cursor,
      },
      req?.user ?? null,
    );
  }

  @Post('posts')
  @Throttle(10, 60)
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async createPost(
    @Body() dto: CreateSquarePostDto,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.squareService.createPost(user.id, dto);
  }

  @Get('posts/:id/comments')
  @SkipAuth()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async listComments(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Req() req?: Request & { user?: User },
  ) {
    const parsedLimit = limit != null ? Number.parseInt(limit, 10) : undefined;
    return this.squareService.listComments(
      id,
      {
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        cursor,
      },
      req?.user ?? null,
    );
  }

  @Post('posts/:id/comments')
  @Throttle(20, 60)
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async createComment(
    @Param('id') id: string,
    @Body() dto: CreateSquareCommentDto,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.squareService.createComment(id, user.id, dto);
  }

  @Delete('comments/:id')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.delete, UserEntity)
  async deleteComment(
    @Param('id') id: string,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.squareService.removeComment(id, user);
  }

  @Delete('posts/:id')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.delete, UserEntity)
  async deletePost(
    @Param('id') id: string,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.squareService.deletePost(id, user);
  }

  @Patch('posts/:id/reactions')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, UserEntity)
  async setReaction(
    @Param('id') id: string,
    @Body() dto: SetSquareReactionDto,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.squareService.setReaction(id, user.id, dto.emoji);
  }

  @Post('posts/:id/poll/vote')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, UserEntity)
  async votePoll(
    @Param('id') id: string,
    @Body() dto: VoteSquarePollDto,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.squareService.votePoll(id, user.id, dto.optionId);
  }

  @Get('users/:handle')
  @SkipAuth()
  async publicProfile(@Param('handle') handle: string) {
    return this.squareService.getPublicProfile(handle);
  }

  @Get('users/:handle/posts')
  @SkipAuth()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async userPosts(
    @Param('handle') handle: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Req() req?: Request & { user?: User },
  ) {
    const parsedLimit = limit != null ? Number.parseInt(limit, 10) : undefined;
    return this.squareService.getUserPosts(
      handle,
      {
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
        cursor,
      },
      req?.user ?? null,
    );
  }

  @Get('conversations')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async conversations(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    if (!user?.id) return [];
    return this.squareService.listConversations(user.id);
  }

  @Post('conversations')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async createConversation(
    @Body() dto: CreateSquareConversationDto,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.squareService.getOrCreateConversation(
      user.id,
      dto.targetUserId,
    );
  }

  @Get('conversations/:id/messages')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async messages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return { items: [], nextCursor: null };
    const parsedLimit = limit != null ? Number.parseInt(limit, 10) : undefined;
    return this.squareService.getMessages(id, user.id, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      cursor,
    });
  }

  @Post('conversations/:id/messages')
  @Throttle(30, 60)
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendSquareMessageDto,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.squareService.sendMessage(id, user.id, dto);
  }
}
