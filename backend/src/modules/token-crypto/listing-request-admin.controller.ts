import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { AccessGuard, CaslUser, UserProxy } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';
import ListingRequestEntity from '@modules/token-crypto/entities/listing-request.entity';
import { ApproveListingRequestDto } from './dto/approve-listing-request.dto';
import { RejectListingRequestDto } from './dto/reject-listing-request.dto';
import { ListingRequestService } from './listing-request.service';
import { User } from '@prisma/client';

@ApiTags('ListingRequest')
@ApiExtraModels(ListingRequestEntity)
@ApiBaseResponses()
@ApiBearerAuth()
@UseGuards(AccessGuard(Roles.admin))
@Controller('/admin/listing-requests')
export class ListingRequestAdminController {
  constructor(private readonly listingRequestService: ListingRequestService) {}

  @Get()
  @ApiOkBaseResponse({ dto: ListingRequestEntity, isArray: true })
  @Serialize(ListingRequestEntity)
  async listPending() {
    return this.listingRequestService.listPending();
  }

  @Patch(':id/approve')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: ApproveListingRequestDto })
  @ApiOkBaseResponse({ dto: ListingRequestEntity })
  @Serialize(ListingRequestEntity)
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveListingRequestDto,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const admin = await userProxy?.get();
    if (!admin?.id) return;
    return this.listingRequestService.approve(id, admin.id, dto);
  }

  @Patch(':id/reject')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ type: RejectListingRequestDto })
  @ApiOkBaseResponse({ dto: ListingRequestEntity })
  @Serialize(ListingRequestEntity)
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectListingRequestDto,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const admin = await userProxy?.get();
    if (!admin?.id) return;
    return this.listingRequestService.reject(id, admin.id, dto.reason);
  }
}
