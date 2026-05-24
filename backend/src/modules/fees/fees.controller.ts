import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { SkipAuth } from '@modules/auth/skip-auth.guard';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TradingFeeService } from './trading-fee.service';

@ApiTags('Fees')
@ApiBaseResponses()
@Controller('fees')
export class FeesController {
  constructor(private readonly tradingFees: TradingFeeService) {}

  /** Bảng phí công khai cho UI (spot, convert, futures). */
  @Get('rates')
  @SkipAuth()
  rates(@Query('liquidationFeeRate') liquidationFeeRate?: string) {
    const liq =
      liquidationFeeRate != null && liquidationFeeRate !== ''
        ? Number(liquidationFeeRate)
        : null;
    return this.tradingFees.getRates(
      Number.isFinite(liq) ? liq : null,
    );
  }
}
