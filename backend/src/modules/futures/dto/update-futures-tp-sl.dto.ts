import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, ValidateIf } from 'class-validator';

export class UpdateFuturesTpSlDto {
  @ApiPropertyOptional({ description: 'null = xóa TP' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsNumber({}, { message: 'takeProfitPrice phải là số.' })
  @IsPositive({ message: 'takeProfitPrice phải dương.' })
  takeProfitPrice?: number | null;

  @ApiPropertyOptional({ description: 'null = xóa SL' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsNumber({}, { message: 'stopLossPrice phải là số.' })
  @IsPositive({ message: 'stopLossPrice phải dương.' })
  stopLossPrice?: number | null;
}
