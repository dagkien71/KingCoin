import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class BulkTargetDto {
  @ApiPropertyOptional({
    description: 'Danh sách tokenId; bỏ trống nếu allAlts=true',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tokenIds?: string[];

  @ApiPropertyOptional({
    description: 'Áp dụng mọi alt (trừ KC stablecoin)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allAlts?: boolean;
}

export class BulkRelativeScheduleDto extends BulkTargetDto {
  @ApiPropertyOptional({ description: 'Phút từ bây giờ nếu không có endAt' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minutes?: number;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsNumber()
  @Min(0.5)
  @Max(2)
  @Type(() => Number)
  minRatio!: number;

  @IsNumber()
  @Min(0.5)
  @Max(2)
  @Type(() => Number)
  maxRatio!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  @Type(() => Number)
  waveCycles?: number;

  @IsOptional()
  @IsBoolean()
  restoreOnEnd?: boolean;
}

export class BulkModelRunDto extends BulkTargetDto {
  @IsString()
  modelId!: string;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  durationMin?: number;

  /** Tham số chung (priceStart/End tính theo spot từng token trên server) */
  @IsOptional()
  params?: Record<string, number>;

  @ApiPropertyOptional({
    description:
      'Preset PP2: model-pump-ramp, model-sin-band, … — server gắn params theo spot',
  })
  @IsOptional()
  @IsString()
  presetId?: string;

  @IsOptional()
  @IsBoolean()
  restoreOnEnd?: boolean;
}

export class BulkPatchBookDto extends BulkTargetDto {
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Max(0.2)
  spreadStep?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  levels?: number | null;
}
