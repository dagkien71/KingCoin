import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import UserEntity from '@modules/user/entities/user.entity';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { SkipAuth } from '@modules/auth/skip-auth.guard';
import {
  InternalWalletTransferDto,
  TransferToUserDto,
} from './dto/wallet-transfer.dto';
import { WalletService } from './wallet.service';

@ApiTags('Wallet')
@ApiBaseResponses()
@Controller('wallets')
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async overview(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.walletService.getOverview(user.id);
  }

  @Get('lookup')
  @SkipAuth()
  lookup(@Query('code') code: string) {
    return this.walletService.lookupWalletCode(code ?? '');
  }

  @Get('transfers')
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async transfers(
    @CaslUser() userProxy: UserProxy<User>,
    @Query('limit') limit?: string,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return [];
    const n = limit ? Number(limit) : 30;
    return this.walletService.listTransfers(
      user.id,
      Number.isFinite(n) ? n : 30,
    );
  }

  @Post('transfer')
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, UserEntity)
  async transfer(
    @CaslUser() userProxy: UserProxy<User>,
    @Body() dto: TransferToUserDto,
  ) {
    const user = await userProxy.get();
    return this.walletService.transferToUser(user.id, dto);
  }

  @Post('transfer-internal')
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, UserEntity)
  async transferInternal(
    @CaslUser() userProxy: UserProxy<User>,
    @Body() dto: InternalWalletTransferDto,
  ) {
    const user = await userProxy.get();
    return this.walletService.transferInternal(user.id, dto);
  }
}
