import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class ApproveListingRequestDto {
  @ApiProperty({ description: 'Thời điểm niêm yết (ISO 8601)' })
  @IsDateString()
  listingAt!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
