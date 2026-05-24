import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '@prisma/client';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    type: String,
    description: 'User email address',
    example: 'example@mail.com',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsNotEmpty({ message: 'email cannot be empty' })
  readonly email!: string;

  @ApiPropertyOptional({
    type: String,
    description: 'User phone number',
    example: '+84123456789',
  })
  @IsString({ message: 'phone must be a string' })
  @IsOptional()
  readonly phone?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Username of the user',
    example: 'user123',
  })
  @IsString({ message: 'username must be a string' })
  @Length(3, 50, { message: 'username must be between 3 and 50 characters' })
  @IsOptional()
  readonly username?: string;

  @ApiProperty({
    type: String,
    description: 'User password',
    default: 'string!12345',
  })
  @IsString({ message: 'password must be a string' })
  @Length(6, 80, { message: 'password must be between 6 and 80 characters' })
  @Matches(/[\d\W]/, {
    message: 'password must contain at least one digit or special character',
  })
  @Matches(/[a-zA-Z]/, { message: 'password must contain at least one letter' })
  @Matches(/^\S+$/, { message: 'password must not contain spaces' })
  readonly password!: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Wallet address of the user',
    example: '0x123456789abcdef',
  })
  @IsString({ message: 'walletAddress must be a string' })
  @IsOptional()
  readonly walletAddress?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsString({ message: 'avatar must be a string' })
  @IsOptional()
  readonly avatar?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'User account balance',
    default: 0,
  })
  @IsNumber({}, { message: 'balance must be a number' })
  @IsOptional()
  readonly balance?: number;

  @ApiPropertyOptional({
    type: String,
    description: 'User birth date',
    format: 'date-time',
    example: '1990-01-01T00:00:00Z',
  })
  @IsDateString({}, { message: 'birthDate must be a valid date' })
  @IsOptional()
  readonly birthDate?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'User status',
    default: 'active',
  })
  @IsString({ message: 'status must be a string' })
  @IsOptional()
  readonly status?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Social links of the user',
  })
  @IsArray({ message: 'socialLinks must be an array' })
  @ArrayNotEmpty({ message: 'socialLinks cannot be empty if provided' })
  @IsOptional()
  readonly socialLinks?: string[];

  @ApiPropertyOptional({
    type: String,
    description: 'User introduction or bio',
  })
  @IsString({ message: 'introduction must be a string' })
  @Length(0, 500, { message: 'introduction must not exceed 500 characters' })
  @IsOptional()
  readonly introduction?: string;

  @ApiProperty({
    type: String,
    enum: Roles,
    description: 'User role',
    default: 'USER',
  })
  @IsEnum(Roles, {
    message: `role must be one of: ${Object.values(Roles).join(', ')}`,
  })
  @IsNotEmpty({ message: 'role cannot be empty' })
  readonly role!: Roles;
}
