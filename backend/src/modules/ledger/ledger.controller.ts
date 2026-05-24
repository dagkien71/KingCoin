import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import UserEntity from '@modules/user/entities/user.entity';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { LedgerService } from './ledger.service';

@ApiTags('Ledger')
@ApiBaseResponses()
@Controller()
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('users/me/balances')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async balances(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.ledgerService.getBalances(user.id);
  }

  @Get('users/me/ledger')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async ledger(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.ledgerService.findForUser(user.id);
  }
}
