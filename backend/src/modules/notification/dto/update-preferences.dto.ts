import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  webPushEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabledTypes?: string[];
}
