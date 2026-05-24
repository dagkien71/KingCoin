import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class PatchMmGlobalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mmEnabled?: boolean | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  flowEnabled?: boolean | null;

  @ApiPropertyOptional({ description: 'Khoảng cách bậc sổ lệnh (tỷ lệ, vd 0.0025 = 0.25%)' })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Max(0.2)
  spreadStep?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  levels?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  qty?: number | null;

  @ApiPropertyOptional({ description: 'Dao động quanh giá DB' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.05)
  oscillatePct?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.02)
  wanderPct?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(0.02)
  levelJitterPct?: number | null;
}

export class PatchMmTokenDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  paused?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  levels?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Max(0.2)
  spreadStep?: number | null;

  @ApiPropertyOptional({ description: 'Bias mid mỗi refresh (vd 0.002 = +0.2%)' })
  @IsOptional()
  @IsNumber()
  @Min(-0.05)
  @Max(0.05)
  midBiasPct?: number;

  @ApiPropertyOptional({ description: 'Ép mid sổ lệnh; null để bỏ' })
  @IsOptional()
  @IsNumber()
  @Min(1e-8)
  forceMid?: number | null;

  @ApiPropertyOptional({ description: 'Kéo mid về giá này; null để bỏ' })
  @IsOptional()
  @IsNumber()
  @Min(1e-8)
  targetPrice?: number | null;
}

export class SetSpotPriceDto {
  @IsNumber()
  @Min(1e-8)
  price!: number;

  @ApiPropertyOptional({ description: 'Ghi log chart (0 = không ghi)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  logVolume?: number;
}

export class CreatePriceScheduleDto {
  /** ISO 8601 — bỏ trống thì bắt đầu ngay (theo server) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endAt?: string;

  @ApiPropertyOptional({
    description: 'Phút từ bây giờ (server) nếu không có endAt',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minutes?: number;

  @IsNumber()
  @Min(1e-8)
  priceMin!: number;

  @IsNumber()
  @Min(1e-8)
  priceMax!: number;

  @ApiPropertyOptional({ description: 'Số chu kỳ sóng trong khoảng A→B', default: 4 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  @Type(() => Number)
  waveCycles?: number;

  @ApiPropertyOptional({
    description: 'Hết B trả giá spot về mức trước khi bật lịch',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  restoreOnEnd?: boolean;
}

export class StartPriceModelRunDto {
  @IsString()
  modelId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endAt?: string;

  @ApiPropertyOptional({
    description: 'Phút từ bây giờ (server) nếu không có endAt',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  durationMin?: number;

  @ApiPropertyOptional({ description: 'Tham số mô hình (JSON object)' })
  @IsOptional()
  params?: Record<string, number>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  restoreOnEnd?: boolean;
}

export class NudgePriceDto {
  @IsEnum(['up', 'down'])
  direction!: 'up' | 'down';

  @ApiPropertyOptional({ description: 'Tỷ lệ (0.01 = 1%)', default: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Type(() => Number)
  pct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  logVolume?: number;
}
