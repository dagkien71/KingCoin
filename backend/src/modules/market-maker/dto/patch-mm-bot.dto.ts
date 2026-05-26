import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class PatchMmBotDto {
  @ApiPropertyOptional({ description: 'Bật/tắt bot riêng lẻ' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
