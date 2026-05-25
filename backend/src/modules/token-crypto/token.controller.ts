import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import ApiBaseResponses from '@decorators/api-base-response.decorator';
import ApiOkBaseResponse from '@decorators/api-ok-base-response.decorator';
import Serialize from '@decorators/serialize.decorator';
import { SkipAuth } from '@modules/auth/skip-auth.guard';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import TokenCryptoBaseEntity from '@modules/token-crypto/entities/token-crypto-base.entity';
import TokenCryptoEntity from '@modules/token-crypto/entities/token-crypto.entity';
import UpcomingListingEntity from '@modules/token-crypto/entities/upcoming-listing.entity';
import { OrderByPipe } from '@nodeteam/nestjs-pipes';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, TokenCrypto, User } from '@prisma/client';
import { Roles } from '@modules/app/app.roles';
import { CreateTokenCryptoDto } from './dto/create-token-crypto-dto';
import { TokenCryptoService } from './token.service';
import { UpcomingListingService } from './upcoming-listing.service';

@ApiTags('TokenCrypto')
@ApiExtraModels(TokenCryptoBaseEntity, UpcomingListingEntity)
@ApiBaseResponses()
@Controller('token-crypto')
export class TokenCryptoController {
  constructor(
    private readonly tokenService: TokenCryptoService,
    private readonly upcomingListingService: UpcomingListingService,
  ) {}

  @Get('upcoming/listings')
  @ApiOkBaseResponse({ dto: UpcomingListingEntity, isArray: true })
  @Serialize(UpcomingListingEntity)
  @UseAbility(Actions.read, TokenCryptoEntity)
  @SkipAuth()
  async listUpcoming() {
    return this.upcomingListingService.listUpcoming();
  }

  @Get('/all')
  @ApiQuery({ name: 'name', required: false, type: 'string' })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  @ApiOkBaseResponse({ dto: TokenCryptoBaseEntity, isArray: true })
  @Serialize(TokenCryptoBaseEntity)
  @UseAbility(Actions.read, TokenCryptoEntity)
  @SkipAuth()
  async findAll(
    @Query('name') name?: string,
    @Query('orderBy', OrderByPipe)
    orderBy?: Prisma.TokenCryptoOrderByWithRelationInput,
  ): Promise<PaginatorTypes.PaginatedResult<TokenCrypto>> {
    return this.tokenService.findAll({ name, orderBy });
  }

  @Get()
  @ApiQuery({ name: 'name', required: false, type: 'string' })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  @ApiOkBaseResponse({ dto: TokenCryptoBaseEntity, isArray: true })
  @ApiBearerAuth()
  @Serialize(TokenCryptoBaseEntity)
  @UseAbility(Actions.read, TokenCryptoEntity)
  async findByUser(
    @Query('name') name?: string,
    @Query('orderBy', OrderByPipe)
    orderBy?: Prisma.TokenCryptoOrderByWithRelationInput,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<PaginatorTypes.PaginatedResult<TokenCrypto>> {
    const tokenUser = await userProxy.get();
    if (!tokenUser?.id) return;
    return this.tokenService.findTokenByUserId({
      name,
      orderBy,
      userId: tokenUser?.id,
    });
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'Token ID' })
  @ApiOkResponse({ description: 'Get Token by ID' })
  @UseAbility(Actions.read, TokenCryptoEntity)
  @SkipAuth()
  async getTokenById(@Param('id') id: string): Promise<TokenCrypto> {
    const token = await this.tokenService.findOne(id);
    if (!token) {
      throw new NotFoundException(`Token không tồn tại: ${id}`);
    }
    return token;
  }

  @Post()
  @ApiOkBaseResponse({ dto: CreateTokenCryptoDto })
  @ApiBody({ type: CreateTokenCryptoDto })
  @Serialize(CreateTokenCryptoDto)
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, CreateTokenCryptoDto)
  async create(
    @Body() createTokenCryptoDto: Prisma.TokenCryptoCreateInput,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<TokenCrypto> {
    const tokenUser = await userProxy.get();
    if (!tokenUser?.id) return;

    if (tokenUser.role !== Roles.admin) {
      throw new BadRequestException(
        'Vui lòng gửi yêu cầu niêm yết qua Issuer Studio — admin sẽ duyệt và chọn ngày list.',
      );
    }

    const payload = { ...createTokenCryptoDto, ownerId: tokenUser.id };
    return this.tokenService.create(payload);
  }
}
