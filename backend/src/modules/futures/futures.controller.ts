import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import UserEntity from '@modules/user/entities/user.entity';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { SkipAuth } from '@modules/auth/skip-auth.guard';
import TokenCryptoEntity from '@modules/token-crypto/entities/token-crypto.entity';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FuturesSide, User } from '@prisma/client';
import { FuturesConfigService } from './futures-config.service';
import { FuturesEngineService } from './futures-engine.service';

@ApiTags('Futures')
@ApiBaseResponses()
@Controller('futures')
export class FuturesController {
  constructor(
    private readonly engine: FuturesEngineService,
    private readonly configService: FuturesConfigService,
  ) {}

  /** Danh sách cặp futures — đồng bộ từ mọi alt spot (trừ KC). */
  @Get('markets')
  @SkipAuth()
  @UseAbility(Actions.read, TokenCryptoEntity)
  async markets() {
    const rows = await this.configService.listSpotMarkets();
    return rows.map(({ futures, ...token }) => ({
      ...token,
      futuresMaxLeverage: futures.maxLeverage,
      futuresEnabled: futures.enabled,
    }));
  }

  @Get('mark-price')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async markPrice(@Query('tokenId') tokenId: string) {
    return this.engine.getMarkPrice(tokenId);
  }

  @Get('config/:tokenId')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async config(@Param('tokenId') tokenId: string) {
    return this.configService.getForToken(tokenId);
  }

  @Get('positions')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async positions(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    if (!user?.id) return [];
    return this.engine.listOpenPositions(user.id);
  }

  @Get('positions/history')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async positionHistory(
    @Query('limit') limit: string | undefined,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return [];
    const n = limit ? Number.parseInt(limit, 10) : 50;
    return this.engine.listPositionHistory(user.id, Number.isFinite(n) ? n : 50);
  }

  @Get('orders')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async orders(
    @Query('limit') limit: string | undefined,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return [];
    const n = limit ? Number.parseInt(limit, 10) : 50;
    return this.engine.listOrders(user.id, Number.isFinite(n) ? n : 50);
  }

  @Post('orders')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async openOrder(
    @Body()
    body: {
      tokenId: string;
      side: FuturesSide;
      leverage: number;
      marginKc?: number;
      size?: number;
      takeProfitPrice?: number | null;
      stopLossPrice?: number | null;
    },
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.engine.openMarket({
      userId: user.id,
      tokenId: body.tokenId,
      side: body.side,
      leverage: Number(body.leverage),
      marginKc: body.marginKc != null ? Number(body.marginKc) : undefined,
      size: body.size != null ? Number(body.size) : undefined,
      takeProfitPrice:
        body.takeProfitPrice != null
          ? Number(body.takeProfitPrice)
          : undefined,
      stopLossPrice:
        body.stopLossPrice != null ? Number(body.stopLossPrice) : undefined,
    });
  }

  @Post('positions/:id/close')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async close(
    @Param('id') id: string,
    @Body() body: { size?: number | null },
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.engine.closeMarket({
      userId: user.id,
      positionId: id,
      closeSize: body.size ?? null,
    });
  }
}
