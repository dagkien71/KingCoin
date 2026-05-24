import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class PushSubscribeDto {
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @IsObject()
  keys!: { p256dh: string; auth: string };

  @IsOptional()
  @IsString()
  userAgent?: string;
}
