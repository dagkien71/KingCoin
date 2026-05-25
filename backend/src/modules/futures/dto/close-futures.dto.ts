import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, ValidateIf } from 'class-validator';

export class CloseFuturesDto {
  @ApiPropertyOptional({
    description: 'Đóng một phần size; null/omit = đóng toàn bộ',
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsNumber({}, { message: 'size phải là số.' })
  @IsPositive({ message: 'size phải lớn hơn 0.' })
  size?: number | null;
}
