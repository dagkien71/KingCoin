import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class SignUpDto {
  @ApiProperty({ type: String, example: 'user@example.com' })
  @IsEmail({}, { message: 'email không hợp lệ.' })
  @IsNotEmpty({ message: 'email không được để trống.' })
  readonly email!: string;

  @ApiProperty({
    type: String,
    description: 'Mật khẩu: ≥6 ký tự, có chữ + số/ký tự đặc biệt, không khoảng trắng',
    example: 'Matkhau1!',
  })
  @IsString({ message: 'password phải là chuỗi.' })
  @IsNotEmpty({ message: 'password không được để trống.' })
  @Length(6, 80, { message: 'password phải từ 6–80 ký tự.' })
  @Matches(/[\d\W]/, {
    message: 'password phải có ít nhất một số hoặc ký tự đặc biệt.',
  })
  @Matches(/[a-zA-Z]/, { message: 'password phải có ít nhất một chữ cái.' })
  @Matches(/^\S+$/, { message: 'password không được chứa khoảng trắng.' })
  readonly password!: string;

  @ApiPropertyOptional({ type: String, example: 'john_doe' })
  @IsOptional()
  @IsString({ message: 'username phải là chuỗi.' })
  @Length(3, 32, { message: 'username phải từ 3–32 ký tự.' })
  readonly username?: string;

  @ApiPropertyOptional({
    type: String,
    description: '10–11 chữ số (tuỳ chọn)',
    example: '0912345678',
  })
  @IsOptional()
  @IsString({ message: 'phone phải là chuỗi.' })
  @Matches(/^[0-9]{10,11}$/, {
    message: 'phone phải gồm 10–11 chữ số.',
  })
  readonly phone?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Mã giới thiệu (từ link ?ref=)',
    example: 'KC1A2B3C',
  })
  @IsOptional()
  @IsString({ message: 'referralCode phải là chuỗi.' })
  @MaxLength(32, { message: 'referralCode tối đa 32 ký tự.' })
  readonly referralCode?: string;
}
