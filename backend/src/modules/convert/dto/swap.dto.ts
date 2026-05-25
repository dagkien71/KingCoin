import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class ConvertSwapDto {
  @ApiProperty()
  @IsString({ message: 'fromTokenId phải là chuỗi.' })
  @IsNotEmpty({ message: 'fromTokenId không được để trống.' })
  fromTokenId!: string;

  @ApiProperty()
  @IsString({ message: 'toTokenId phải là chuỗi.' })
  @IsNotEmpty({ message: 'toTokenId không được để trống.' })
  toTokenId!: string;

  @ApiProperty({ description: 'Số lượng token nguồn' })
  @Type(() => Number)
  @IsNumber({}, { message: 'amount phải là số.' })
  @IsPositive({ message: 'amount phải lớn hơn 0.' })
  amount!: number;
}
