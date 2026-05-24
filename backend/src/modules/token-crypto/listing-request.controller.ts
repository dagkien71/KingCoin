import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiTags,
} from '@nestjs/swagger';

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
import { CreateTokenCryptoDto } from '@modules/token-crypto/dto/create-token-crypto-dto';
import ListingRequestEntity from '@modules/token-crypto/entities/listing-request.entity';
import { ListingRequestService } from './listing-request.service';
import { User } from '@prisma/client';
import { Prisma } from '@prisma/client';

@ApiTags('ListingRequest')
@ApiExtraModels(ListingRequestEntity)
@ApiBaseResponses()
@ApiBearerAuth()
@Controller('listing-requests')
export class ListingRequestController {
  constructor(private readonly listingRequestService: ListingRequestService) {}

  @Post()
  @ApiOkBaseResponse({ dto: ListingRequestEntity })
  @ApiBody({ type: CreateTokenCryptoDto })
  @Serialize(ListingRequestEntity)
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, CreateTokenCryptoDto)
  async submit(
    @Body() body: CreateTokenCryptoDto,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy?.get();
    if (!user?.id) return;
    return this.listingRequestService.submit(user.id, {
      name: body.name,
      symbol: body.symbol,
      logo: body.logo,
      decimals: Number(body.decimals),
      totalSupply: Number(body.totalSupply),
      initialPrice:
        body.initialPrice != null ? Number(body.initialPrice) : undefined,
      description: body.description,
      communityLinks: body.communityLinks as unknown as
        | Prisma.InputJsonValue
        | undefined,
    });
  }

  @Get('mine')
  @ApiOkBaseResponse({ dto: ListingRequestEntity, isArray: true })
  @Serialize(ListingRequestEntity)
  @UseGuards(AccessGuard)
  async listMine(@CaslUser() userProxy?: UserProxy<User>) {
    const user = await userProxy?.get();
    if (!user?.id) return [];
    return this.listingRequestService.listMine(user.id);
  }
}
