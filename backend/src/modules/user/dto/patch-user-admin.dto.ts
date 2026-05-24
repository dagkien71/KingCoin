import { ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class PatchUserAdminDto {
  @ApiPropertyOptional({ enum: Roles })
  @IsOptional()
  @IsEnum(Roles)
  role?: Roles;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
