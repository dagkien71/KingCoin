import { PriceAlertDirection, PriceAlertMarketKind } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePriceAlertDto {
  @IsString()
  tokenId!: string;

  @IsOptional()
  @IsEnum(PriceAlertMarketKind)
  marketKind?: PriceAlertMarketKind;

  @IsEnum(PriceAlertDirection)
  direction!: PriceAlertDirection;

  @IsNumber()
  @Min(0.00000001)
  targetPrice!: number;
}
