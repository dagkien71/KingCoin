import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'email không hợp lệ.' })
  @IsNotEmpty({ message: 'email không được để trống.' })
  readonly email!: string;

  @IsString({ message: 'code phải là chuỗi.' })
  @Matches(/^\d{6}$/, { message: 'Mã xác nhận gồm 6 chữ số.' })
  readonly code!: string;
}

export class ResendVerificationDto {
  @IsEmail({}, { message: 'email không hợp lệ.' })
  @IsNotEmpty({ message: 'email không được để trống.' })
  readonly email!: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'email không hợp lệ.' })
  @IsNotEmpty({ message: 'email không được để trống.' })
  readonly email!: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'email không hợp lệ.' })
  @IsNotEmpty({ message: 'email không được để trống.' })
  readonly email!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Mã đặt lại mật khẩu gồm 6 chữ số.' })
  readonly code!: string;

  @IsString({ message: 'password phải là chuỗi.' })
  @IsNotEmpty({ message: 'password không được để trống.' })
  @Length(6, 80, { message: 'password phải từ 6–80 ký tự.' })
  @Matches(/[\d\W]/, {
    message: 'password phải có ít nhất một số hoặc ký tự đặc biệt.',
  })
  @Matches(/[a-zA-Z]/, { message: 'password phải có ít nhất một chữ cái.' })
  @Matches(/^\S+$/, { message: 'password không được chứa khoảng trắng.' })
  readonly password!: string;
}
