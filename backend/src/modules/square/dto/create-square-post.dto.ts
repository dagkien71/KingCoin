import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SQUARE_POST_KIND } from '../square.constants';

export class CreateSquarePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly body?: string;

  @IsOptional()
  @IsIn([
    SQUARE_POST_KIND.text,
    SQUARE_POST_KIND.orderSpot,
    SQUARE_POST_KIND.orderFutures,
    SQUARE_POST_KIND.poll,
  ])
  readonly kind?: string;

  @ValidateIf((o) => o.kind === SQUARE_POST_KIND.orderSpot)
  @IsOptional()
  @IsString()
  readonly orderId?: string;

  @ValidateIf((o) => o.kind === SQUARE_POST_KIND.orderFutures)
  @IsOptional()
  @IsString()
  readonly positionId?: string;

  @ValidateIf((o) => o.kind === SQUARE_POST_KIND.poll)
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  readonly pollOptions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  readonly multipleChoice?: boolean;

  /** URL từ POST /upload — không dùng @IsUrl (localhost dev bị reject) */
  @ApiPropertyOptional({
    type: [String],
    maxItems: 4,
    description: 'URL ảnh từ POST /upload (http/https, tối đa 4)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  readonly imageUrls?: string[];
}
