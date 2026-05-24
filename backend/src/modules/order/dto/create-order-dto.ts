import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateOrderDto {
  @ApiProperty({
    type: String,
    description: 'The ID of the coin associated with the order',
    example: '5bdb8976-ec8a-4aee-8a8d-20245ceb6354',
  })
  @IsString()
  @IsNotEmpty()
  tokenId: string;

  @ApiProperty({
    enum: OrderType,
    description: 'The type of order (buy or sell)',
    example: OrderType.BUY,
  })
  @IsEnum(OrderType)
  @IsNotEmpty()
  type: OrderType;

  @ApiProperty({
    type: Number,
    description: 'The price per unit of the coin',
    example: 100.5,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  price: number;

  @ApiProperty({
    type: Number,
    description: 'The quantity of the coin to buy/sell',
    example: 10,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  quantity: number;
}
