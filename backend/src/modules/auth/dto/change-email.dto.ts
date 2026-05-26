import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail({}, { message: 'email mới không hợp lệ.' })
  @IsNotEmpty({ message: 'email mới không được để trống.' })
  readonly newEmail!: string;

  @IsString({ message: 'password phải là chuỗi.' })
  @IsNotEmpty({ message: 'password không được để trống.' })
  readonly currentPassword!: string;
}

export class ConfirmEmailChangeDto {
  @IsString({ message: 'code phải là chuỗi.' })
  @Matches(/^\d{6}$/, { message: 'Mã xác nhận gồm 6 chữ số.' })
  readonly code!: string;
}
