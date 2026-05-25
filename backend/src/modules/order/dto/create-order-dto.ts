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
  @IsString({ message: 'tokenId phải là chuỗi.' })
  @IsNotEmpty({ message: 'tokenId không được để trống.' })
  tokenId: string;

  @ApiProperty({
    enum: OrderType,
    description: 'The type of order (buy or sell)',
    example: OrderType.BUY,
  })
  @IsEnum(OrderType, { message: 'type phải là buy hoặc sell.' })
  @IsNotEmpty({ message: 'type không được để trống.' })
  type: OrderType;

  @ApiProperty({
    type: Number,
    description: 'The price per unit of the coin',
    example: 100.5,
  })
  @IsNumber({}, { message: 'price phải là số.' })
  @IsPositive({ message: 'price phải lớn hơn 0.' })
  @IsNotEmpty({ message: 'price không được để trống.' })
  price: number;

  @ApiProperty({
    type: Number,
    description: 'The quantity of the coin to buy/sell',
    example: 10,
  })
  @IsNumber({}, { message: 'quantity phải là số.' })
  @IsPositive({ message: 'quantity phải lớn hơn 0.' })
  @IsNotEmpty({ message: 'quantity không được để trống.' })
  quantity: number;
}
