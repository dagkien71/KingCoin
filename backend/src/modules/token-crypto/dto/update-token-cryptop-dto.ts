import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
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
export class UpdateTokenCryptoDto {
  @ApiProperty({ type: String, description: 'The name of the token' })
  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(18)
  name: string;

  @ApiProperty({
    type: String,
    description: 'The symbol of the token (e.g., BTC, ETH)',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  symbol: string;

  @ApiProperty({
    type: String,
    description: 'The logo URL of the token',
    nullable: true,
  })
  @Expose()
  @IsString()
  @IsOptional()
  @IsUrl()
  logo?: string | null;

  @ApiProperty({
    type: Number,
    description: 'The number of decimal places the token supports',
  })
  @Expose()
  @IsInt()
  @Min(0)
  @Max(18)
  decimals: number;

  @ApiProperty({
    type: String,
    description: 'The status of the token (e.g., active, inactive, pending)',
  })
  @Expose()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  status: string;

  @ApiProperty({
    type: Number,
    description: 'The initial price of the token at launch',
  })
  @Expose()
  @IsNumber()
  @IsOptional()
  initialPrice?: number;

  @ApiProperty({ type: Number, description: 'The total supply of tokens' })
  @Expose()
  @IsNumber()
  @IsPositive()
  totalSupply: number;

  @ApiProperty({
    type: Number,
    description: 'The circulating supply of tokens',
  })
  @Expose()
  @IsNumber()
  @IsPositive()
  circulatingSupply: number;

  @ApiProperty({ type: String, description: 'The URL of the token whitepaper' })
  @Expose()
  @IsString()
  @IsOptional()
  @IsUrl()
  whitepaperUrl?: string;

  @ApiProperty({
    type: String,
    description: 'A brief description of the token or its project',
  })
  @Expose()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    type: 'object',
    properties: {
      website: {
        type: 'string',
      },
      telegram: {
        type: 'string',
      },
      discord: {
        type: 'string',
      },
      twitter: {
        type: 'string',
      },
    },
    description: 'URLs for community links (e.g., Telegram, Discord, Twitter)',
  })
  @Expose()
  @IsOptional()
  communityLinks?: JSON;
}
