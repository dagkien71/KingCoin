import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SignUpResponseEntity {
  @ApiProperty()
  @Expose()
  readonly id: string;

  @ApiProperty()
  @Expose()
  readonly email: string;

  @ApiProperty({ nullable: true })
  @Expose()
  readonly username: string | null;

  @ApiProperty({
    description: 'false = SMTP lỗi hoặc chưa cấu hình — dùng resend-verification',
  })
  @Expose()
  readonly verificationEmailSent: boolean;
}
