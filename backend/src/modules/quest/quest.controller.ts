import { SkipAuth } from '@modules/auth/skip-auth.guard';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import UserEntity from '@modules/user/entities/user.entity';
import { QuestService } from './quest.service';

@ApiTags('Quests')
@ApiBaseResponses()
@Controller('quests')
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async list(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    if (!user?.id) return [];
    return this.questService.listForUser(user.id);
  }

  @Post(':id/engage')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async engage(
    @Param('id') id: string,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.questService.engage(user.id, id);
  }

  @Post(':id/claim')
  @Throttle(10, 60)
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async claim(
    @Param('id') id: string,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.questService.claim(user.id, id);
  }
}
