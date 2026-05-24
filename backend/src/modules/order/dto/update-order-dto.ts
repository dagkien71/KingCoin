import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
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

@Exclude()
export class UpdateOrderDto {
  @ApiProperty({
    type: String,
    description: 'The ID of the coin associated with the order',
  })
  @Expose()
  @IsString()
  @IsOptional()
  @IsUUID()
  tokenId?: string;

  @ApiProperty({
    enum: OrderType,
    description: 'The type of order (buy or sell)',
    example: OrderType.BUY,
  })
  @Expose()
  @IsEnum(OrderType)
  @IsOptional()
  type?: OrderType;

  @ApiProperty({
    type: Number,
    description: 'The price per unit of the coin',
    example: 100.5,
  })
  @Expose()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  price?: number;

  @ApiProperty({
    type: Number,
    description: 'The quantity of the coin to buy/sell',
    example: 10,
  })
  @Expose()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  quantity?: number;

  @ApiProperty({
    enum: OrderStatus,
    description: 'The status of the order',
    example: OrderStatus.PENDING,
  })
  @Expose()
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
