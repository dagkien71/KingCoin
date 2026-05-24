import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import UserEntity from '@modules/user/entities/user.entity';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ConvertService } from './convert.service';

@ApiTags('Convert')
@ApiBaseResponses()
@Controller('convert')
export class ConvertController {
  constructor(private readonly convertService: ConvertService) {}

  @Post('swap')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async swap(
    @Body()
    body: {
      fromTokenId: string;
      toTokenId: string;
      amount: number;
    },
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.convertService.swap({
      userId: user.id,
      fromTokenId: body.fromTokenId,
      toTokenId: body.toTokenId,
      amount: Number(body.amount),
    });
  }
}
