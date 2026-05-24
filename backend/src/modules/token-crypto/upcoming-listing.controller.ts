import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiParam,
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
import TokenCryptoEntity from '@modules/token-crypto/entities/token-crypto.entity';
import UpcomingListingEntity from '@modules/token-crypto/entities/upcoming-listing.entity';
import UpcomingListingDetailEntity from '@modules/token-crypto/entities/upcoming-listing-detail.entity';
import { UpcomingPreorderDto } from './dto/upcoming-preorder.dto';
import { UpcomingListingService } from './upcoming-listing.service';
import { User } from '@prisma/client';

@ApiTags('TokenCrypto')
@ApiExtraModels(
  UpcomingListingEntity,
  UpcomingListingDetailEntity,
)
@ApiBaseResponses()
@Controller('token-crypto/upcoming')
export class UpcomingListingController {
  constructor(private readonly upcomingService: UpcomingListingService) {}

  @Get('listings/:key')
  @ApiParam({ name: 'key', description: 'ID hoặc symbol' })
  @ApiOkBaseResponse({ dto: UpcomingListingDetailEntity })
  @Serialize(UpcomingListingDetailEntity)
  @UseAbility(Actions.read, TokenCryptoEntity)
  @SkipAuth()
  async getDetail(
    @Param('key') key: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    let userId: string | undefined;
    try {
      const user = await userProxy?.get();
      userId = user?.id;
    } catch {
      userId = undefined;
    }
    return this.upcomingService.getDetail(key, userId);
  }

  @Post('listings/:key/preorder')
  @ApiParam({ name: 'key', description: 'ID hoặc symbol' })
  @ApiBody({ type: UpcomingPreorderDto })
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, TokenCryptoEntity)
  async placePreorder(
    @Param('key') key: string,
    @Body() dto: UpcomingPreorderDto,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy?.get();
    if (!user?.id) return;
    return this.upcomingService.placePreorder(
      key,
      user.id,
      Number(dto.amountKc),
    );
  }

  @Delete('listings/:key/preorder')
  @ApiParam({ name: 'key', description: 'ID hoặc symbol' })
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, TokenCryptoEntity)
  async cancelPreorder(
    @Param('key') key: string,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy?.get();
    if (!user?.id) return;
    await this.upcomingService.cancelPreorder(key, user.id);
    return { ok: true };
  }
}
