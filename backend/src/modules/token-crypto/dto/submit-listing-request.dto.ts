import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CommunityLinksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString({ message: 'website phải là chuỗi.' })
  @IsUrl({}, { message: 'website phải là URL hợp lệ.' })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'telegram phải là chuỗi.' })
  telegram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'discord phải là chuỗi.' })
  discord?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'twitter phải là chuỗi.' })
  twitter?: string;
}

/** Body gửi yêu cầu niêm yết token — khớp form issuer. */
export class SubmitListingRequestDto {
  @ApiProperty({ example: 'Solar Coin' })
  @IsString({ message: 'name phải là chuỗi.' })
  @IsNotEmpty({ message: 'name không được để trống.' })
  @MaxLength(18, { message: 'name tối đa 18 ký tự.' })
  @Matches(/[a-zA-Z]/, { message: 'name phải có ít nhất một chữ cái.' })
  name!: string;

  @ApiProperty({ example: 'SLR' })
  @IsString({ message: 'symbol phải là chuỗi.' })
  @IsNotEmpty({ message: 'symbol không được để trống.' })
  @MaxLength(10, { message: 'symbol tối đa 10 ký tự.' })
  @Matches(/[a-zA-Z]/, { message: 'symbol phải có ít nhất một chữ cái.' })
  symbol!: string;

  @ApiPropertyOptional({ description: 'URL logo (tuỳ chọn)' })
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @IsString({ message: 'logo phải là chuỗi.' })
  @IsUrl({}, { message: 'logo phải là URL hợp lệ.' })
  logo?: string | null;

  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsInt({ message: 'decimals phải là số nguyên.' })
  @Min(0, { message: 'decimals tối thiểu 0.' })
  @Max(18, { message: 'decimals tối đa 18.' })
  decimals!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({}, { message: 'initialPrice phải là số.' })
  @IsPositive({ message: 'initialPrice phải lớn hơn 0.' })
  initialPrice!: number;

  @ApiProperty({ example: 1_000_000 })
  @Type(() => Number)
  @IsNumber({}, { message: 'totalSupply phải là số.' })
  @IsPositive({ message: 'totalSupply phải lớn hơn 0.' })
  totalSupply!: number;

  @ApiProperty({ example: 'Mô tả dự án…' })
  @IsString({ message: 'description phải là chuỗi.' })
  @IsNotEmpty({ message: 'description không được để trống.' })
  @MaxLength(500, { message: 'description tối đa 500 ký tự.' })
  description!: string;

  @ApiPropertyOptional({ type: CommunityLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CommunityLinksDto)
  communityLinks?: CommunityLinksDto;
}
