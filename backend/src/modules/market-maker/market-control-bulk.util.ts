import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { BadRequestException } from '@nestjs/common';
import { TokenCrypto } from '@prisma/client';
import { isQuoteToken } from './liquidity-target-tokens.util';
import { BulkTargetDto } from './dto/market-control-bulk.dto';

export async function resolveBulkTargetTokens(
  tokenService: TokenCryptoService,
  dto: BulkTargetDto,
): Promise<TokenCrypto[]> {
  const tokensResult = await tokenService.findAll({});
  const list = tokensResult.data ?? [];
  const alts = list.filter((t) => !isQuoteToken(t));

  if (dto.allAlts) {
    if (!alts.length) {
      throw new BadRequestException('Không có altcoin nào để áp dụng.');
    }
    return alts;
  }

  const ids = new Set((dto.tokenIds ?? []).filter(Boolean));
  if (!ids.size) {
    throw new BadRequestException(
      'Chọn ít nhất một token hoặc bật allAlts.',
    );
  }

  const picked = alts.filter((t) => ids.has(t.id));
  if (!picked.length) {
    throw new BadRequestException(
      'Không có token hợp lệ trong danh sách (có thể là KC hoặc id sai).',
    );
  }
  return picked;
}
