import { ApiProperty, PartialType } from '@nestjs/swagger';
import { OrderStatus, User } from '@prisma/client';
import { Exclude, Expose } from 'class-transformer';
import OrderEntity from './order.entity';

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
}

@Exclude()
export default class OrderBaseEntity extends PartialType(OrderEntity) {
  @ApiProperty({ type: String, description: 'Order ID' })
  @Expose()
  declare readonly id: string;

  @ApiProperty({
    type: String,
    description: 'The ID of the user who created the order',
  })
  @Expose()
  declare readonly userId: string;

  @ApiProperty({
    type: Object,
    description: 'The user who created the order',
  })
  @Expose()
  declare readonly user: User;

  @ApiProperty({
    type: String,
    description: 'The ID of the coin associated with the order',
  })
  @Expose()
  declare readonly tokenId: string;

  @ApiProperty({
    enum: OrderType,
    description: 'The type of order (buy or sell)',
    example: OrderType.BUY,
  })
  @Expose()
  declare readonly type: OrderType;

  @ApiProperty({
    enum: OrderStatus,
    description: 'The type of order (buy or sell)',
    example: OrderStatus.pending,
  })
  @Expose()
  declare readonly status: OrderStatus;

  @ApiProperty({
    type: Number,
    description: 'The price per unit of the coin',
    example: 100.5,
  })
  @Expose()
  declare readonly price: number;

  @ApiProperty({
    type: Number,
    description: 'The quantity of the coin to buy/sell',
    example: 10,
  })
  @Expose()
  declare readonly quantity: number;

  @ApiProperty({
    type: Number,
    description: 'Quantity already matched',
    example: 0,
  })
  @Expose()
  declare readonly matchedQuantity: number;

  @ApiProperty({
    type: String,
    description: 'The pair of order',
    example: 'BTC/KC',
  })
  @Expose()
  declare readonly pair: string;

  @ApiProperty({ type: Date, description: 'When the order was placed' })
  @Expose()
  declare readonly createdAt: Date;

  @ApiProperty({ type: Date, description: 'Last update time' })
  @Expose()
  declare readonly updatedAt: Date;
}
