import { AccessGuard } from '@modules/casl';
import { LiquidityOrdersAdminService } from '@modules/market-maker/liquidity-orders-admin.service';
import type { LiquidityBotRole } from '@modules/market-maker/liquidity-orders-admin.service';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '@prisma/client';

@ApiTags('LiquidityOrders')
@ApiBearerAuth()
@UseGuards(AccessGuard(Roles.admin))
@Controller('/admin/liquidity-orders')
export class LiquidityOrdersAdminController {
  constructor(private readonly monitor: LiquidityOrdersAdminService) {}

  @Get()
  @ApiQuery({ name: 'tokenId', required: false })
  @ApiQuery({ name: 'role', required: false, enum: ['mm', 'flow', 'user_bot'] })
  @ApiQuery({ name: 'pendingLimit', required: false, type: Number })
  @ApiQuery({ name: 'fillsLimit', required: false, type: Number })
  getMonitor(
    @Query('tokenId') tokenId?: string,
    @Query('role') role?: LiquidityBotRole,
    @Query('pendingLimit') pendingLimit?: string,
    @Query('fillsLimit') fillsLimit?: string,
  ) {
    return this.monitor.getMonitor({
      tokenId: tokenId?.trim() || undefined,
      role:
        role === 'mm' || role === 'flow' || role === 'user_bot'
          ? role
          : undefined,
      pendingLimit: pendingLimit ? Number(pendingLimit) : undefined,
      fillsLimit: fillsLimit ? Number(fillsLimit) : undefined,
    });
  }
}
