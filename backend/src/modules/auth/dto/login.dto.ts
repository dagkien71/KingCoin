import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ type: String, default: 'admin@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({
    type: String,
    default: '932f3c1b56257ce8539ac269d7aab42550dacf8818d075f0bdf1990562aae3ef',
  })
  @IsString()
  @Length(6, 80)
  readonly password!: string;
}
