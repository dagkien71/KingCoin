import { AccessGuard } from '@modules/casl';
import { PlatformLiquiditySettingsService } from '@modules/market-maker/platform-liquidity-settings.service';
import { PatchPlatformLiquiditySettingsDto } from '@modules/market-maker/dto/patch-platform-liquidity-settings.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@prisma/client';

@ApiTags('MarketSettings')
@ApiBearerAuth()
@UseGuards(AccessGuard(Roles.admin))
@Controller('/admin/market-settings')
export class MarketSettingsAdminController {
  constructor(
    private readonly platformSettings: PlatformLiquiditySettingsService,
  ) {}

  @Get()
  getSettings() {
    return this.platformSettings.getAdminView();
  }

  @Patch()
  patchSettings(@Body() dto: PatchPlatformLiquiditySettingsDto) {
    return this.platformSettings.patch(dto);
  }

  @Post('reset-env')
  resetToEnv() {
    return this.platformSettings.resetToEnv();
  }

  @Post('presets/normal-steady')
  applyNormalSteady() {
    return this.platformSettings.applyNormalSteadyPreset();
  }

  @Post('presets/volatility/:level')
  applyVolatility(@Param('level') level: string) {
    return this.platformSettings.applyVolatilityPreset(level);
  }
}
