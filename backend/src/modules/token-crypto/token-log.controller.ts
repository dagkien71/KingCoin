import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TokenCryptoLogService } from './token-log.service';
import { SkipAuth } from '@modules/auth/skip-auth.guard';

@ApiTags('Token-Crypto-Log')
@Controller('crypto-logs')
@SkipAuth()
export class TokenCryptoLogController {
  constructor(private readonly logService: TokenCryptoLogService) {}

  @Get(':tokenId')
  async getLogsByToken(
    @Param('tokenId') tokenId: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit != null ? Number.parseInt(limit, 10) : NaN;
    const capped = Number.isFinite(parsed)
      ? Math.min(5000, Math.max(100, parsed))
      : 2500;
    return this.logService.getLogsByToken(tokenId, { limit: capped });
  }

  @Post('create-log')
  async createLog(
    @Body()
    {
      tokenId,
      price,
      volume,
    }: {
      tokenId: string;
      price: number;
      volume: number;
    },
  ) {
    return this.logService.createLog(tokenId, price, volume);
  }

  @Get(':tokenId/volumes')
  async getVolumes(@Param('tokenId') tokenId: string) {
    return this.logService.getVolumes(tokenId);
  }
}
