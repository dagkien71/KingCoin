import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
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
import { AccessGuard, Actions, UseAbility } from '@modules/casl';
import TokenCryptoBaseEntity from '@modules/token-crypto/entities/token-crypto-base.entity';
import TokenCryptoEntity from '@modules/token-crypto/entities/token-crypto.entity';
import { OrderByPipe } from '@nodeteam/nestjs-pipes';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, Roles, TokenCrypto } from '@prisma/client';
import { CreateTokenCryptoDto } from './dto/create-token-crypto-dto';
import { UpdateTokenCryptoDto } from './dto/update-token-cryptop-dto';
import { parseTokenListPagination } from './token-pagination.util';
import { TokenCryptoService } from './token.service';

@ApiTags('TokenCrypto')
@ApiExtraModels(TokenCryptoBaseEntity)
@ApiBaseResponses()
@ApiBearerAuth()
@UseGuards(AccessGuard(Roles.admin))
@Controller('/admin/token-crypto')
export class TokenCryptoAdminController {
  constructor(private readonly tokenService: TokenCryptoService) {}

  @Get()
  @ApiQuery({ name: 'name', required: false, type: 'string' })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiOkBaseResponse({ dto: TokenCryptoBaseEntity, isArray: true })
  @Serialize(TokenCryptoBaseEntity)
  @UseAbility(Actions.read, TokenCryptoEntity)
  async findAll(
    @Query('name') name?: string,
    @Query('orderBy', OrderByPipe)
    orderBy?: Prisma.TokenCryptoOrderByWithRelationInput,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): Promise<PaginatorTypes.PaginatedResult<TokenCrypto>> {
    const pg = parseTokenListPagination(page, perPage);
    return this.tokenService.findAll({
      name,
      orderBy,
      page: pg.page,
      perPage: pg.perPage,
    });
  }

  @Post()
  @ApiOkBaseResponse({ dto: CreateTokenCryptoDto })
  @ApiBody({ type: CreateTokenCryptoDto })
  @Serialize(CreateTokenCryptoDto)
  @UseAbility(Actions.create, CreateTokenCryptoDto)
  async create(
    @Body() createTokenCryptoDto: Prisma.TokenCryptoCreateInput,
  ): Promise<TokenCrypto> {
    return this.tokenService.create(createTokenCryptoDto);
  }

  @Patch(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'Token ID' })
  @ApiBody({ type: UpdateTokenCryptoDto })
  @ApiOkBaseResponse({ dto: UpdateTokenCryptoDto })
  @Serialize(UpdateTokenCryptoDto)
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, TokenCryptoEntity)
  async update(
    @Param('id') id: string,
    @Body() updateTokenCryptoDto: Prisma.TokenCryptoUpdateInput,
  ): Promise<TokenCrypto> {
    return this.tokenService.update(id, updateTokenCryptoDto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'TokenCrypto deleted successfully' })
  @UseAbility(Actions.delete, TokenCryptoEntity)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.tokenService.delete(id);
    return { message: 'TokenCrypto deleted successfully' };
  }
}
