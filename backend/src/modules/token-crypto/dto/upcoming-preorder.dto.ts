import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpcomingPreorderDto {
  @ApiProperty({ description: 'Số KC dự kiến dùng mua khi mở cửa' })
  @IsNumber()
  @Min(0)
  amountKc!: number;
}

export class UpcomingPreorderOptionalDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountKc?: number;
}
