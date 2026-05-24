import ApiBaseResponses from '@decorators/api-base-response.decorator';
import ApiOkBaseResponse from '@decorators/api-ok-base-response.decorator';
import Serialize from '@decorators/serialize.decorator';
import { AccessGuard, Actions, CaslUser, UseAbility } from '@modules/casl';
import UserBaseEntity from '@modules/user/entities/user-base.entity';
import UserEntity from '@modules/user/entities/user.entity';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(UserBaseEntity)
@ApiBaseResponses()
@Controller('admin/users')
export class UserAdminController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiQuery({ name: 'where', required: false, type: 'string' })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  @ApiOkBaseResponse({ dto: UserBaseEntity, isArray: true })
  @UseGuards(AccessGuard(Roles.admin))
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.read, UserEntity)
  async findAll(
    @Query('where', WherePipe) where?: Prisma.UserWhereInput,
    @Query('orderBy', OrderByPipe)
    orderBy?: Prisma.UserOrderByWithRelationInput,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    return this.userService.findAll(where, orderBy);
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

  @Delete(':id')
  @ApiOkResponse({ description: 'User deleted successfully' })
  @UseGuards(AccessGuard(Roles.admin))
  @UseAbility(Actions.delete, UserBaseEntity)
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.userService.delete(id);
    return { message: 'User deleted successfully' };
  }
}
