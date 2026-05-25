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
import { SkipAuth } from '@modules/auth/skip-auth.guard';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import OrderBaseEntity from '@modules/order/entities/order-base.entity';
import OrderEntity from '@modules/order/entities/order.entity';
import { OrderByPipe } from '@nodeteam/nestjs-pipes';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Order, Prisma, TradeFill, User } from '@prisma/client';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { CreateOrderDto } from './dto/create-order-dto';
import { UpdateOrderDto } from './dto/update-order-dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@ApiExtraModels(OrderBaseEntity)
@ApiBaseResponses()
@Controller('orders')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly tokenCryptoService: TokenCryptoService,
  ) {}

  @Get('market-price')
  @SkipAuth()
  @ApiQuery({ name: 'tokenId', required: true, type: 'string' })
  @ApiQuery({ name: 'side', required: true, enum: ['buy', 'sell'] })
  async marketPrice(
    @Query('tokenId') tokenId: string,
    @Query('side') side: 'buy' | 'sell',
  ) {
    return this.orderService.getMarketPrice(tokenId, side);
  }

  @Get('trades/recent')
  @SkipAuth()
  @ApiQuery({ name: 'tokenId', required: true, type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  async recentTrades(
    @Query('tokenId') tokenId: string,
    @Query('limit') limit?: string,
  ): Promise<TradeFill[]> {
    const n = limit ? Math.min(200, parseInt(limit, 10) || 50) : 50;
    return this.orderService.findRecentFills(tokenId, n);
  }

  @Get('trades')
  @SkipAuth()
  @ApiQuery({ name: 'tokenId', required: false, type: 'string' })
  @ApiQuery({ name: 'userId', required: false, type: 'string' })
  async listTrades(
    @Query('tokenId') tokenId?: string,
    @Query('userId') userId?: string,
  ) {
    return this.orderService.findFills({ tokenId, userId });
  }

  @Get('/all')
  @ApiQuery({ name: 'userId', required: false, type: 'string' })
  @ApiQuery({ name: 'tokenId', required: false, type: 'string' })
  @ApiQuery({
    name: 'type',
    required: false,
    type: 'string',
    enum: ['buy', 'sell'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    enum: ['pending', 'complete', 'cancel'],
  })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  @ApiOkBaseResponse({ dto: OrderBaseEntity, isArray: true })
  @Serialize(OrderBaseEntity)
  @UseAbility(Actions.read, OrderEntity)
  @SkipAuth()
  async findAll(
    @Query('userId') userId?: string,
    @Query('tokenId') tokenId?: string,
    @Query('type') type?: 'buy' | 'sell',
    @Query('status') status?: 'pending' | 'complete' | 'cancel',
    @Query('orderBy', OrderByPipe)
    orderBy?: Prisma.OrderOrderByWithRelationInput,
  ): Promise<PaginatorTypes.PaginatedResult<Order>> {
    return this.orderService.findAll({
      userId,
      tokenId,
      type,
      status,
      orderBy,
    });
  }

  @Get()
  @ApiQuery({ name: 'userId', required: false, type: 'string' })
  @ApiQuery({ name: 'tokenId', required: false, type: 'string' })
  @ApiQuery({
    name: 'type',
    required: false,
    type: 'string',
    enum: ['buy', 'sell'],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    enum: ['pending', 'complete', 'cancel'],
  })
  @ApiQuery({ name: 'orderBy', required: false, type: 'string' })
  @ApiOkBaseResponse({ dto: OrderBaseEntity, isArray: true })
  @ApiBearerAuth()
  @Serialize(OrderBaseEntity)
  @UseAbility(Actions.read, OrderEntity)
  async findByUser(
    @Query('userId') userId?: string,
    @Query('tokenId') tokenId?: string,
    @Query('type') type?: 'buy' | 'sell',
    @Query('status') status?: 'pending' | 'complete' | 'cancel',
    @Query('orderBy', OrderByPipe)
    orderBy?: Prisma.OrderOrderByWithRelationInput,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<PaginatorTypes.PaginatedResult<Order>> {
    const user = await userProxy.get();
    if (!user?.id) return;
    return this.orderService.findAll({
      userId: user.id,
      tokenId,
      type,
      status,
      orderBy,
    });
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID' })
  @ApiOkResponse({ description: 'Get Order by ID' })
  @UseAbility(Actions.read, OrderEntity)
  @SkipAuth()
  async getOrderById(@Param('id') id: string): Promise<Order> {
    return this.orderService.findById(id);
  }

  @Post()
  @ApiOkBaseResponse({ dto: CreateOrderDto })
  @ApiBody({ type: CreateOrderDto })
  @Serialize(CreateOrderDto)
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, CreateOrderDto)
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CaslUser() userProxy?: UserProxy<User>,
  ): Promise<Order> {
    const user = await userProxy.get();
    if (!user?.id) return;
    const quote = process.env.QUOTE_DISPLAY_SYMBOL?.trim() || 'KC';
    let baseSymbol = 'TOKEN';
    try {
      const token = await this.tokenCryptoService.findById(
        createOrderDto.tokenId,
      );
      if (token?.symbol?.trim()) {
        baseSymbol = token.symbol.trim().toUpperCase();
      }
    } catch {
      /* giữ TOKEN nếu không resolve được */
    }
    const payload: Prisma.OrderCreateInput = {
      tokenId: createOrderDto.tokenId,
      price: createOrderDto.price,
      quantity: createOrderDto.quantity,
      user: { connect: { id: user.id } },
      type: createOrderDto.type as 'buy' | 'sell',
      pair: `${baseSymbol}/${quote}`,
    };
    return this.orderService.create(payload);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, OrderEntity)
  async patchOrder(
    @Param('id') id: string,
    @Body() body: UpdateOrderDto,
  ): Promise<Order> {
    const data: Prisma.OrderUpdateInput = {};
    if (body.price != null) data.price = body.price;
    if (body.quantity != null) data.quantity = body.quantity;
    return this.orderService.update(id, data);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'Order ID to delete' })
  @ApiOkResponse({ description: 'Delete Order by ID' })
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.delete, OrderEntity)
  async deleteOrder(@Param('id') id: string): Promise<{ message: string }> {
    const order = await this.orderService.findById(id);
    if (!order) {
      return { message: 'Order not found' };
    }
    await this.orderService.delete(id);
    return { message: 'Order deleted successfully' };
  }
}
