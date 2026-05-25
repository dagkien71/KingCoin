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
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { FuturesConfigService } from './futures-config.service';
import { FuturesEngineService } from './futures-engine.service';
import { OpenFuturesDto } from './dto/open-futures.dto';
import { CloseFuturesDto } from './dto/close-futures.dto';
import { UpdateFuturesTpSlDto } from './dto/update-futures-tp-sl.dto';

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
  @ApiBody({ type: OpenFuturesDto })
  async openOrder(
    @Body() body: OpenFuturesDto,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.engine.openMarket({
      userId: user.id,
      tokenId: body.tokenId,
      side: body.side,
      leverage: body.leverage,
      marginKc: body.marginKc,
      size: body.size,
      takeProfitPrice: body.takeProfitPrice,
      stopLossPrice: body.stopLossPrice,
    });
  }

  @Patch('positions/:id/tp-sl')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, UserEntity)
  @ApiBody({ type: UpdateFuturesTpSlDto })
  async updateTpSl(
    @Param('id') id: string,
    @Body() body: UpdateFuturesTpSlDto,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    if (!user?.id) return null;
    return this.engine.updatePositionTpSl(user.id, id, {
      takeProfitPrice: body.takeProfitPrice,
      stopLossPrice: body.stopLossPrice,
    });
  }

  @Post('positions/:id/close')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  @ApiBody({ type: CloseFuturesDto })
  async close(
    @Param('id') id: string,
    @Body() body: CloseFuturesDto,
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
