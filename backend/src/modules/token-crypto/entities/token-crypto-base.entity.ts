import TokenCryptoEntity from '@modules/token-crypto/entities/token-crypto.entity';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Order, User } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { Exclude, Expose } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

@Exclude()
export default class TokenCryptoBaseEntity extends PartialType(
  TokenCryptoEntity,
) {
  @ApiProperty({ type: String })
  @Expose()
  declare readonly id: string;

  @ApiProperty({ type: String, maxLength: 18, nullable: true })
  @Expose()
  declare readonly name: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  declare readonly logo: string | null;

  @ApiProperty({ type: String, maxLength: 10, nullable: true })
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(10)
  declare readonly symbol: string | null;

  @ApiProperty({
    type: Number,
    description: 'The number of decimal places the token supports',
    nullable: true,
  })
  @Expose()
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(18)
  declare readonly decimals: number | null;

  @ApiProperty({
    type: String,
    maxLength: 20,
    nullable: true,
    description: 'The status of the token',
  })
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(20)
  declare readonly status: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The current price of the token in KC (quote)',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly price: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The market capitalization of the token in KC (quote)',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly marketCap: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The total supply of tokens',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly totalSupply: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The circulating supply of tokens',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly circulatingSupply: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The launch date of the token',
  })
  @Expose()
  @IsString()
  @IsOptional()
  @IsDateString()
  declare readonly launchDate: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The URL of the token whitepaper',
  })
  @Expose()
  @IsString()
  @IsOptional()
  @IsUrl()
  declare readonly whitepaperUrl: string | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    description:
      'The owner or creator of the token (e.g., wallet address or entity)',
  })
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  declare readonly owner: User | null;

  @ApiProperty({
    type: Boolean,
    nullable: true,
    description: 'Indicates whether the token is verified',
  })
  @Expose()
  @IsBoolean()
  @IsOptional()
  declare readonly isVerified: boolean | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'A brief description of the token or its project',
  })
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  declare readonly description: string | null;

  @ApiProperty({
    nullable: true,
    description: 'URLs for community links (e.g., Telegram, Discord, Twitter)',
  })
  @Expose()
  @IsOptional()
  declare readonly communityLinks: JsonValue | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The initial price of the token at launch',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly initialPrice: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The rank of the token',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly rank: number | null;

  // New Fields
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The all-time high price of the token in KC (quote)',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly athPrice: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The all-time low price of the token in KC (quote)',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly atlPrice: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The day high price of the token in KC (quote)',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly athPriceDay: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The all-time high change as a percentage',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly athPercentage: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The all-time low change as a percentage',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly atlPercentage: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The day high change as a percentage',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly athPercentageDay: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The day low change as a percentage',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly atlPercentageDay: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The volume of tokens traded in the last 24 hours',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  @IsPositive()
  declare readonly volumes: JsonValue | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: '% thay đổi giá so với 1 giờ trước',
  })
  @Expose()
  @IsOptional()
  declare readonly priceChange1h: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: '% thay đổi giá so với 24 giờ trước',
  })
  @Expose()
  @IsOptional()
  declare readonly priceChange24h: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: '% thay đổi giá so với 7 ngày trước',
  })
  @Expose()
  @IsOptional()
  declare readonly priceChange7d: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'stablecoin | volatile — KC là stablecoin',
  })
  @Expose()
  @IsString()
  @IsOptional()
  declare readonly tokenKind: string | null;

  @ApiProperty({
    type: Object,
    nullable: true,
    description: 'Đặc tả stablecoin (peg, dự trữ…) — docs/STABLECOIN_KC_SPEC.md',
  })
  @Expose()
  @IsOptional()
  declare readonly stablecoinSpec: JsonValue | null;

  @ApiProperty({
    type: Array<Order>,
  })
  @Expose()
  declare readonly orders: Order[] | null;
}
