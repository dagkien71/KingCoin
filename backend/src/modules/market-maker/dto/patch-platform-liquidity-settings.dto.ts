import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PatchPlatformLiquiditySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly mmEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readonly flowEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Chu kỳ refresh sổ MM (ms), min 300' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(300)
  @Max(60_000)
  readonly mmIntervalMs?: number;

  @ApiPropertyOptional({ description: 'Chu kỳ flow taker (ms), min 150' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(150)
  @Max(60_000)
  readonly flowIntervalMs?: number;

  @ApiPropertyOptional({ description: 'Số bot MM bật (trong pool env)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(32)
  readonly mmBotCount?: number;

  @ApiPropertyOptional({ description: 'Số bot flow bật' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(16)
  readonly flowBotCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  readonly levels?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  @Max(0.2)
  readonly spreadStep?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  readonly qty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100_000)
  readonly flowQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(0.05)
  readonly oscillatePct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(0.02)
  readonly wanderPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(0.02)
  readonly levelJitterPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  readonly multiMidStep?: number;

  @ApiPropertyOptional({
    description: 'Mức cường độ thị trường: gentle | moderate | stable | strong | extreme',
  })
  @IsOptional()
  @IsString()
  @IsIn(['gentle', 'moderate', 'stable', 'strong', 'extreme'])
  readonly volatilityLevel?: string;
}
