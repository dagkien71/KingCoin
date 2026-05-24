import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectListingRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
