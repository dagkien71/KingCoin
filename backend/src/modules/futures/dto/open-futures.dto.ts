import { FuturesSide } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  Validate,
  ValidateIf,
} from 'class-validator';
import { MarginOrSizeConstraint } from './margin-or-size.constraint';

export class OpenFuturesDto {
  @ApiProperty({ description: 'ID token alt (không phải KC)' })
  @IsString({ message: 'tokenId phải là chuỗi.' })
  @IsNotEmpty({ message: 'tokenId không được để trống.' })
  tokenId!: string;

  @ApiProperty({ enum: FuturesSide })
  @IsEnum(FuturesSide, { message: 'side phải là long hoặc short.' })
  side!: FuturesSide;

  @ApiProperty({ example: 10, description: 'Đòn bẩy' })
  @Validate(MarginOrSizeConstraint)
  @Type(() => Number)
  @IsNumber({}, { message: 'leverage phải là số.' })
  @Min(1, { message: 'leverage tối thiểu là 1.' })
  leverage!: number;

  @ApiPropertyOptional({ description: 'Margin KC (ưu tiên nếu có)' })
  @ValidateIf((o) => o.size == null || o.size === undefined)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'marginKc phải là số.' })
  @IsPositive({ message: 'marginKc phải lớn hơn 0.' })
  marginKc?: number;

  @ApiPropertyOptional({ description: 'Size token (nếu không gửi marginKc)' })
  @ValidateIf((o) => o.marginKc == null || o.marginKc === undefined)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'size phải là số.' })
  @IsPositive({ message: 'size phải lớn hơn 0.' })
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'takeProfitPrice phải là số.' })
  @IsPositive({ message: 'takeProfitPrice phải dương.' })
  takeProfitPrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'stopLossPrice phải là số.' })
  @IsPositive({ message: 'stopLossPrice phải dương.' })
  stopLossPrice?: number | null;
}
