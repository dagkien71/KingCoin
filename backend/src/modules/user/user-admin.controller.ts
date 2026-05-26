import ApiBaseResponses from '@decorators/api-base-response.decorator';
import ApiOkBaseResponse from '@decorators/api-ok-base-response.decorator';
import Serialize from '@decorators/serialize.decorator';
import { AccessGuard, Actions, CaslUser, UseAbility } from '@modules/casl';
import UserBaseEntity from '@modules/user/entities/user-base.entity';
import UserEntity from '@modules/user/entities/user.entity';
import { LedgerService } from '@modules/ledger/ledger.service';
import { FuturesEngineService } from '@modules/futures/futures-engine.service';
import { UserAdminInsightsService } from '@modules/user/user-admin-insights.service';
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OrderByPipe, WherePipe } from '@nodeteam/nestjs-pipes';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, Roles, User } from '@prisma/client';
import {
  liquidityBotUsersWhere,
  resolveUserAccountTags,
  traderUsersWhere,
} from '../../common/system-accounts.util';
import { parseUserListPagination } from './user-pagination.util';
import { CreateUserDto } from './dto/create-user.dto';
import { PatchUserAdminDto } from './dto/patch-user-admin.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(UserBaseEntity)
@ApiBaseResponses()
@Controller('admin/users')
export class UserAdminController {
  constructor(
    private readonly userService: UserService,
    private readonly insights: UserAdminInsightsService,
    private readonly ledgerService: LedgerService,
    private readonly futuresEngine: FuturesEngineService,
  ) {}

  @Get()
  @ApiQuery({ name: 'where', required: false, type: 'string' })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['traders', 'bots', 'all'],
    description: 'traders (mặc định) | bots | all',
  })
  @ApiOkBaseResponse({ dto: UserBaseEntity, isArray: true })
  @UseGuards(AccessGuard(Roles.admin))
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.read, UserEntity)
  async findAll(
    @Query('where', WherePipe) where?: Prisma.UserWhereInput,
    @Query('orderBy', OrderByPipe)
    orderBy?: Prisma.UserOrderByWithRelationInput,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('scope') scope?: string,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    const pg = parseUserListPagination(page, perPage);
    const scopeNorm = (scope ?? 'traders').toLowerCase();
    const mergedWhere: Prisma.UserWhereInput =
      scopeNorm === 'all'
        ? { ...(where ?? {}) }
        : scopeNorm === 'bots'
          ? liquidityBotUsersWhere(where)
          : traderUsersWhere(where);

    const order =
      orderBy ?? ({ createdAt: 'desc' } as Prisma.UserOrderByWithRelationInput);

    const [result, total] = await Promise.all([
      this.userService.findAll(mergedWhere, order, pg),
      this.userService.countUsers(mergedWhere),
    ]);

    const lastPage = Math.max(1, Math.ceil(total / pg.perPage));

    return {
      ...result,
      data: result.data.map((u) => ({
        ...u,
        accountTags: resolveUserAccountTags(
          u.email,
          u.username,
          (u as User & { accountTags?: string[] }).accountTags ?? [],
        ),
      })),
      meta: {
        ...result.meta,
        total,
        lastPage,
        currentPage: pg.page,
        perPage: pg.perPage,
        prev: pg.page > 1 ? pg.page - 1 : null,
        next: pg.page < lastPage ? pg.page + 1 : null,
      },
    };
  }

  @Post()
  @ApiBody({ type: CreateUserDto })
  @ApiOkBaseResponse({ dto: UserBaseEntity })
  @UseGuards(AccessGuard(Roles.admin))
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.create, UserEntity)
  async create(
    @Body() createUserDto: CreateUserDto,
    @CaslUser() user: User,
  ): Promise<User> {
    return this.userService.create(createUserDto);
  }

  @Get(':id/overview')
  @UseGuards(AccessGuard(Roles.admin))
  @UseAbility(Actions.read, UserEntity)
  async getOverview(@Param('id') id: string) {
    return this.insights.getOverview(id);
  }

  @Get(':id/balances')
  @UseGuards(AccessGuard(Roles.admin))
  @UseAbility(Actions.read, UserEntity)
  async getBalances(@Param('id') id: string) {
    await this.insights.findUserOrThrow(id);
    return this.ledgerService.getBalances(id);
  }

  @Get(':id/orders')
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'complete', 'cancel'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @UseGuards(AccessGuard(Roles.admin))
  @UseAbility(Actions.read, UserEntity)
  async getOrders(
    @Param('id') id: string,
    @Query('status') status?: 'pending' | 'complete' | 'cancel',
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const p = page ? Number.parseInt(page, 10) : 1;
    const pp = perPage ? Number.parseInt(perPage, 10) : 30;
    return this.insights.listOrders(id, {
      status,
      page: Number.isFinite(p) ? p : 1,
      perPage: Number.isFinite(pp) ? pp : 30,
    });
  }

  @Get(':id/ledger')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @UseGuards(AccessGuard(Roles.admin))
  @UseAbility(Actions.read, UserEntity)
  async getLedger(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const p = page ? Number.parseInt(page, 10) : 1;
    const pp = perPage ? Number.parseInt(perPage, 10) : 30;
    return this.insights.listLedger(
      id,
      Number.isFinite(p) ? p : 1,
      Number.isFinite(pp) ? pp : 30,
    );
  }

  @Get(':id/futures/positions')
  @UseGuards(AccessGuard(Roles.admin))
  @UseAbility(Actions.read, UserEntity)
  async getFuturesPositions(@Param('id') id: string) {
    await this.insights.findUserOrThrow(id);
    return this.futuresEngine.listOpenPositions(id);
  }

  @Get(':id/futures/history')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @UseGuards(AccessGuard(Roles.admin))
  @UseAbility(Actions.read, UserEntity)
  async getFuturesHistory(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    await this.insights.findUserOrThrow(id);
    const n = limit ? Number.parseInt(limit, 10) : 50;
    return this.futuresEngine.listPositionHistory(
      id,
      Number.isFinite(n) ? n : 50,
    );
  }

  @Patch(':id')
  @ApiOkBaseResponse({ dto: UserBaseEntity })
  @UseGuards(AccessGuard(Roles.admin))
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.update, UserEntity)
  async patch(
    @Param('id') id: string,
    @Body() dto: PatchUserAdminDto,
  ): Promise<User> {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'User deleted successfully' })
  @UseGuards(AccessGuard(Roles.admin))
  @UseAbility(Actions.delete, UserBaseEntity)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.userService.delete(id);
    return { message: 'User deleted successfully' };
  }
}
