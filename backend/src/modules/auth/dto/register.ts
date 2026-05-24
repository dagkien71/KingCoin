import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

export class SignUpDto {
  @ApiProperty({ type: String, example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({
    type: String,
    description:
      'User password with at least one letter and one digit/special character',
    example: 'String!12345',
  })
  @IsString()
  @Length(6, 80)
  @Matches(/[\d\W]/, {
    message: 'Password must contain at least one digit or special character',
  })
  @Matches(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
  @Matches(/^\S+$/, { message: 'Password must not contain spaces' })
  readonly password!: string;

  @ApiPropertyOptional({ type: String, example: 'john_doe' })
  @IsString()
  @IsOptional()
  readonly username?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'User phone number with country code',
    example: '+84123456789',
  })
  @IsString()
  @IsOptional()
  readonly phone?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Mã giới thiệu (từ link ?ref=)',
    example: 'KC1A2B3C',
  })
  @IsString()
  @IsOptional()
  readonly referralCode?: string;
}
