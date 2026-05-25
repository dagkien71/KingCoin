import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ type: String, default: 'admin@gmail.com' })
  @IsEmail({}, { message: 'email không hợp lệ.' })
  @IsNotEmpty({ message: 'email không được để trống.' })
  readonly email!: string;

  @ApiProperty({
    type: String,
    default: '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef',
  })
  @IsString({ message: 'password phải là chuỗi.' })
  @IsNotEmpty({ message: 'password không được để trống.' })
  @Length(6, 80, { message: 'password phải từ 6–80 ký tự.' })
  readonly password!: string;
}
