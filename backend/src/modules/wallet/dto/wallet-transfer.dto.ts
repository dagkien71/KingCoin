import { WalletPool } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class TransferToUserDto {
  @IsString({ message: 'toWalletCode phải là chuỗi.' })
  @IsNotEmpty({ message: 'Mã ví nhận không được để trống.' })
  readonly toWalletCode!: string;

  @IsNumber({}, { message: 'amount phải là số.' })
  @IsPositive({ message: 'amount phải lớn hơn 0.' })
  @Min(0.01, { message: 'Số tiền chuyển tối thiểu 0.01 KC.' })
  @Max(1_000_000_000, { message: 'Số tiền chuyển quá lớn.' })
  readonly amount!: number;

  @IsEnum(WalletPool, { message: 'fromWallet không hợp lệ.' })
  readonly fromWallet!: WalletPool;

  @IsOptional()
  @IsEnum(WalletPool, { message: 'toWallet không hợp lệ.' })
  readonly toWallet?: WalletPool;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'note tối đa 120 ký tự.' })
  readonly note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64, { message: 'idempotencyKey tối đa 64 ký tự.' })
  readonly idempotencyKey?: string;
}

export class InternalWalletTransferDto {
  @IsEnum(WalletPool, { message: 'fromWallet không hợp lệ.' })
  readonly fromWallet!: WalletPool;

  @IsEnum(WalletPool, { message: 'toWallet không hợp lệ.' })
  readonly toWallet!: WalletPool;

  @IsNumber({}, { message: 'amount phải là số.' })
  @IsPositive({ message: 'amount phải lớn hơn 0.' })
  @Min(0.01, { message: 'Số tiền chuyển tối thiểu 0.01 KC.' })
  @Max(1_000_000_000, { message: 'Số tiền chuyển quá lớn.' })
  readonly amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64, { message: 'idempotencyKey tối đa 64 ký tự.' })
  readonly idempotencyKey?: string;
}
