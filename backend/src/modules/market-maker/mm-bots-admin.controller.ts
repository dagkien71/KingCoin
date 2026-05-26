import { AccessGuard } from '@modules/casl';
import { PatchMmBotDto } from '@modules/market-maker/dto/patch-mm-bot.dto';
import { MarketMakerService } from '@modules/market-maker/market-maker.service';
import { MmLiquidityBootstrapService } from '@modules/market-maker/mm-liquidity-bootstrap.service';
import { MmBotRegistryService } from '@modules/market-maker/mm-bot-registry.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import {
  flowLiquidityEmails,
  mmLiquidityEmails,
} from '@modules/market-maker/liquidity-bots.util';

@ApiTags('MmBots')
@ApiBearerAuth()
@UseGuards(AccessGuard(Roles.admin))
@Controller('/admin/mm-bots')
export class MmBotsAdminController {
  constructor(
    private readonly registry: MmBotRegistryService,
    private readonly liquidityBootstrap: MmLiquidityBootstrapService,
    private readonly marketMaker: MarketMakerService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getDashboard() {
    return this.registry.getAdminDashboard();
  }

  /** Tạo/sync bot MM+flow trong DB — thay cho `node scripts/ensure-liquidity-bots.js` trên Render Shell. */
  @Post('bootstrap')
  async bootstrapLiquidityBots() {
    const result = await this.liquidityBootstrap.ensureAllLiquidityBots();
    const dashboard = await this.registry.getAdminDashboard();
    const created =
      result.mm.filter((r) => r.created).length +
      result.flow.filter((r) => r.created).length;
    return {
      ok: true,
      created,
      mm: result.mm.length,
      flow: result.flow.length,
      results: result,
      dashboard,
    };
  }

  @Patch(':email')
  async patchBot(
    @Param('email') emailParam: string,
    @Body() dto: PatchMmBotDto,
  ) {
    const email = decodeURIComponent(emailParam).trim();
    this.assertKnownBot(email);

    const override = this.registry.patchBot(email, dto);

    if (dto.enabled === false) {
      const user = await this.prisma.user.findFirst({ where: { email } });
      if (user) {
        await this.registry.cancelPendingOrdersForUser(user.id);
      }
    } else if (dto.enabled === true) {
      await this.marketMaker.triggerRefresh();
    }

    const dash = await this.registry.getAdminDashboard();
    const bot = dash.bots.find(
      (b) => b.email.toLowerCase() === email.toLowerCase(),
    );
    return { ok: true, override, bot };
  }

  @Post(':email/cancel-orders')
  async cancelOrders(@Param('email') emailParam: string) {
    const email = decodeURIComponent(emailParam).trim();
    this.assertKnownBot(email);
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      throw new NotFoundException('Bot chưa được tạo trong DB');
    }
    const cancelled = await this.registry.cancelPendingOrdersForUser(user.id);
    return { ok: true, cancelled };
  }

  @Post(':email/refresh')
  async refreshBot(@Param('email') emailParam: string) {
    const email = decodeURIComponent(emailParam).trim();
    this.assertKnownBot(email);
    if (!this.registry.isBotEnabled(email, 'mm')) {
      throw new BadRequestException('Bot MM đang tắt — bật lại trước khi refresh');
    }
    await this.marketMaker.triggerRefreshForBot(email);
    const dash = await this.registry.getAdminDashboard();
    const bot = dash.bots.find(
      (b) => b.email.toLowerCase() === email.toLowerCase(),
    );
    return { ok: true, bot };
  }

  private assertKnownBot(email: string): void {
    const known = new Set(
      [...mmLiquidityEmails(), ...flowLiquidityEmails()].map((e) =>
        e.toLowerCase(),
      ),
    );
    if (!known.has(email.toLowerCase())) {
      throw new NotFoundException('Email không thuộc danh sách bot thanh khoản');
    }
  }
}
