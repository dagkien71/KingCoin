import { UpdateUserDto } from './dto/update-user.dto';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import ApiOkBaseResponse from '@decorators/api-ok-base-response.decorator';
import Serialize from '@decorators/serialize.decorator';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import UserBaseEntity from '@modules/user/entities/user-base.entity';
import UserEntity from '@modules/user/entities/user.entity';
import { UserHook } from '@modules/user/user.hook';
import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiTags,
} from '@nestjs/swagger';
import { Prisma, User } from '@prisma/client';
import { ReferralService } from '@modules/referral/referral.service';
import { PortfolioPnlService } from './portfolio-pnl.service';
import { UserService } from './user.service';

@ApiTags('Users')
@ApiExtraModels(UserBaseEntity)
@ApiBaseResponses()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly referralService: ReferralService,
    private readonly portfolioPnl: PortfolioPnlService,
  ) {}

  @Get('me')
  @ApiOkBaseResponse({ dto: UserBaseEntity })
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.read, UserEntity)
  async me(@CaslUser() userProxy?: UserProxy<User>): Promise<User> {
    const tokenUser = await userProxy.get();
    const row = await this.portfolioPnl.syncUserNavPnL(tokenUser.id);
    return {
      ...row,
      isVerified: row.emailVerifiedAt != null,
    } as User;
  }

  @Patch('me')
  @ApiBody({ type: UpdateUserDto })
  @Serialize(UpdateUserDto)
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.update, UserEntity, UserHook)
  async updateUser(
    @Body() dataUpdateUserDto: Prisma.UserUpdateInput,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<User> {
    const tokenUser = await userProxy.get();
    return this.userService.update(tokenUser.id, dataUpdateUserDto);
  }

  @Get('me/referral')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async myReferral(@CaslUser() userProxy?: UserProxy<User>) {
    const tokenUser = await userProxy.get();
    return this.referralService.getReferralStats(tokenUser.id);
  }

  @Post('watch-list')
  @ApiBody({ description: 'Add token IDs to watch list', type: [String] })
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async addWatchList(
    @Body() tokenIds: string[],
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<{ message: string }> {
    const tokenUser = await userProxy.get();
    await this.userService.addTokensToWatchList(tokenUser.id, tokenIds);
    return { message: 'Watch list updated successfully' };
  }

  @Post('me/tours/:tourId/complete')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.update, UserEntity, UserHook)
  async completeTour(
    @Param('tourId') tourId: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<User> {
    const tokenUser = await userProxy.get();
    return this.userService.completeTour(tokenUser.id, tourId.trim());
  }
}
