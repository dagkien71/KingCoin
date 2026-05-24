import { NotificationService } from '@modules/notification/notification.service';
import { tradeDeeplink } from '../../common/token-route.util';
import { BotInventoryService } from '@modules/market-maker/bot-inventory.service';
import { RealtimeService } from '@modules/realtime/realtime.service';
import { LedgerService } from '@modules/ledger/ledger.service';
import { UserRepository } from '@modules/user/user.repository';
import { TokenCryptoRepository } from '@modules/token-crypto/token.repository';
import { TokenCryptoLogService } from '@modules/token-crypto/token-log.service';
import {
  buildPriceChangePercents,
  PRICE_CHANGE_WINDOWS_MS,
} from '@modules/token-crypto/price-change.util';
import {
  deriveMarketCapKc,
  tokenSupplyForMarketCap,
  tradeVolumeKc,
  withDerivedMarketCap,
  withDerivedMarketCapList,
} from '@modules/token-crypto/token-market.util';
import { assertPositiveSpotPrice } from '../../common/spot-price.util';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import {
  NotificationPriority,
  NotificationType,
  Prisma,
  TokenCrypto,
} from '@prisma/client';

export type PriceChangePercentsStored = {
  priceChange1h: number | null;
  priceChange24h: number | null;
  priceChange7d: number | null;
};

@Injectable()
export class TokenCryptoService {
  constructor(
    private readonly tokenRepository: TokenCryptoRepository,
    private readonly userRepository: UserRepository,
    private readonly ledgerService: LedgerService,
    private readonly botInventoryService: BotInventoryService,
    private readonly realtimeService: RealtimeService,
    private readonly tokenLogService: TokenCryptoLogService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Tính lại % 1h / 24h / 7d từ log giá — @see docs/PRICE_CHANGE_PCT_SPEC.md
   */
  async syncPriceChangePercents(
    tokenId: string,
    currentPrice?: number,
  ): Promise<PriceChangePercentsStored> {
    const token = await this.tokenRepository.findById(tokenId);
    const now = Date.now();
    const price =
      currentPrice != null && currentPrice > 0
        ? currentPrice
        : token?.price && token.price > 0
          ? token.price
          : null;

    if (!token || price == null) {
      return { priceChange1h: null, priceChange24h: null, priceChange7d: null };
    }

    const [p1h, p24h, p7d] = await Promise.all([
      this.tokenLogService.getPriceAtOrBefore(
        tokenId,
        new Date(now - PRICE_CHANGE_WINDOWS_MS.h1),
      ),
      this.tokenLogService.getPriceAtOrBefore(
        tokenId,
        new Date(now - PRICE_CHANGE_WINDOWS_MS.h24),
      ),
      this.tokenLogService.getPriceAtOrBefore(
        tokenId,
        new Date(now - PRICE_CHANGE_WINDOWS_MS.d7),
      ),
    ]);

    const changes = buildPriceChangePercents(price, p1h, p24h, p7d);

    await this.tokenRepository.update(tokenId, {
      priceChange1h: changes.priceChange1h ?? null,
      priceChange24h: changes.priceChange24h ?? null,
      priceChange7d: changes.priceChange7d ?? null,
    });

    return {
      priceChange1h: changes.priceChange1h,
      priceChange24h: changes.priceChange24h,
      priceChange7d: changes.priceChange7d,
    };
  }

  async syncAllPriceChangePercents(): Promise<void> {
    const tokens = await this.tokenRepository.findMany({
      select: { id: true, price: true },
    });
    for (const t of tokens) {
      if (t.price != null && t.price > 0) {
        await this.syncPriceChangePercents(t.id, t.price);
      }
    }
  }

  async findById(id: string): Promise<TokenCrypto> {
    const token = await this.tokenRepository.findById(id);
    return token ? withDerivedMarketCap(token) : token;
  }

  /**
   * @desc Find a token by id
   * @param id
   * @returns Promise<TokenCrypto>
   */
  findOne(idOrName: string): Promise<TokenCrypto | null> {
    const key = idOrName?.trim();
    if (!key) return Promise.resolve(null);
    return this.tokenRepository
      .findOne({
        where: {
          OR: [{ id: key }, { name: key }, { symbol: key }],
        },
      })
      .then((t) => (t ? withDerivedMarketCap(t) : null));
  }

  /**
   * @desc Find all tokens with pagination
   * @param where
   * @param orderBy
   */
  async findAll(params: {
    name?: string;
    orderBy?: Prisma.TokenCryptoOrderByWithRelationInput;
  }): Promise<PaginatorTypes.PaginatedResult<TokenCrypto>> {
    const { name, orderBy } = params;
    const where: Prisma.TokenCryptoWhereInput = {};

    if (name) {
      where.OR = [
        { name: { contains: name, mode: 'insensitive' } },
        { symbol: { contains: name, mode: 'insensitive' } },
      ];
    }

    const result = await this.tokenRepository.findAll(
      where,
      orderBy ?? { marketCap: 'desc' },
    );
    return {
      ...result,
      data: withDerivedMarketCapList(result.data),
    };
  }

  /**
   * @desc Find all tokens with pagination
   * @param where
   * @param orderBy
   */
  async findTokenByUserId(params: {
    userId: string;
    name?: string;
    orderBy?: Prisma.TokenCryptoOrderByWithRelationInput;
  }): Promise<PaginatorTypes.PaginatedResult<TokenCrypto>> {
    const { name, orderBy, userId } = params;
    const where: Prisma.TokenCryptoWhereInput = {
      ownerId: userId,
    };

    if (name) {
      where.OR = [
        { name: { contains: name, mode: 'insensitive' } },
        { symbol: { contains: name, mode: 'insensitive' } },
      ];
    }

    const result = await this.tokenRepository.findAll(
      where,
      orderBy ?? { marketCap: 'desc' },
    );
    return {
      ...result,
      data: withDerivedMarketCapList(result.data),
    };
  }

  /**
   * @desc Create a new token
   * @param createTokenCryptoDto
   * @returns Promise<TokenCrypto>
   */
  async create(
    createTokenCryptoDto: Prisma.TokenCryptoCreateInput,
    options?: { skipListingFee?: boolean },
  ): Promise<TokenCrypto> {
    const ownerId =
      (createTokenCryptoDto as { ownerId?: string }).ownerId ??
      undefined;
    const listingFee = options?.skipListingFee
      ? 0
      : Number(process.env.TOKEN_LISTING_FEE_KC ?? '1000');

    if (ownerId && listingFee > 0) {
      const kc = await this.userRepository.getQuoteBalance(ownerId);
      if (kc < listingFee - 1e-9) {
        throw new BadRequestException(
          `Không đủ KC để phát hành token. Cần ${listingFee} KC, hiện có ${kc.toFixed(4)} KC.`,
        );
      }
      const quoteId = await this.userRepository.getQuoteTokenId();
      if (quoteId) {
        await this.userRepository.adjustBalanceTokenByUserId(
          ownerId,
          quoteId,
          -listingFee,
        );
      } else {
        await this.userRepository.adjustStableCoinByUserId(
          ownerId,
          -listingFee,
        );
      }
    }

    const { totalSupply, initialPrice } = createTokenCryptoDto;
    if (initialPrice != null) {
      assertPositiveSpotPrice(Number(initialPrice), 'Giá khởi điểm');
    }
    const calculatedPrice = initialPrice;
    const supply =
      createTokenCryptoDto.circulatingSupply ?? totalSupply ?? 0;
    const calculatedMarketCap = deriveMarketCapKc(calculatedPrice, supply);

    const updatedDto = {
      ...createTokenCryptoDto,
      price: calculatedPrice,
      marketCap: calculatedMarketCap,
    };
    const newToken = await this.tokenRepository.create(updatedDto);

    if (ownerId && listingFee > 0) {
      const quoteId = await this.userRepository.getQuoteTokenId();
      await this.ledgerService.append({
        userId: ownerId,
        amount: -listingFee,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType: 'listing_fee',
        refId: newToken.id,
        note: `Phí phát hành ${newToken.symbol ?? newToken.name}`,
      });
    }

    try {
      await this.botInventoryService.creditNewTokenToBots(newToken.id);
    } catch (err) {
      console.error('Bot inventory after token create:', err);
    }

    await this.updateRanks();

    if (ownerId) {
      const sym = newToken.symbol ?? newToken.name ?? 'Token';
      const deeplink = tradeDeeplink(
        newToken.symbol,
        newToken.name,
        newToken.id,
      );
      if (listingFee > 0) {
        await this.notifications.notify({
          userId: ownerId,
          type: NotificationType.LISTING_FEE,
          priority: NotificationPriority.normal,
          title: 'Phí phát hành token',
          body: `Đã trừ ${listingFee} KC phí listing ${sym}.`,
          dedupeKey: `LISTING_FEE:${newToken.id}`,
          payload: {
            deeplink,
            tokenId: newToken.id,
            symbol: sym,
            amountKc: listingFee,
          },
        });
      }
      await this.notifications.notify({
        userId: ownerId,
        type: NotificationType.TOKEN_LISTED,
        priority: NotificationPriority.normal,
        title: 'Token đã phát hành',
        body: `${sym} đã sẵn sàng trên thị trường.`,
        dedupeKey: `TOKEN_LISTED:${newToken.id}`,
        payload: { deeplink, tokenId: newToken.id, symbol: sym },
      });
    }

    return newToken;
  }

  /** Tổng hợp volume từ TokenCryptoLog → ghi `TokenCrypto.volumes` (cron + sau khớp lệnh). */
  async syncVolumesFromLogs(tokenId: string): Promise<Record<string, number>> {
    const volumes = await this.tokenLogService.getVolumes(tokenId);
    const payload = {
      volume1h: volumes.volume1h,
      volume24h: volumes.volume24h,
      volume1w: volumes.volume1w,
      volume1m: volumes.volume1m,
      volume1y: volumes.volume1y,
    };
    await this.tokenRepository.update(tokenId, {
      volumes: payload as unknown as Prisma.InputJsonValue,
    });
    return payload;
  }

  async updateRanks(): Promise<void> {
    const tokens = await this.tokenRepository.findMany({});
    const ranked = withDerivedMarketCapList(tokens).sort(
      (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0),
    );

    await Promise.all(
      ranked.map((token, index) =>
        this.tokenRepository.update(token.id, {
          rank: index + 1,
          marketCap: token.marketCap,
        }),
      ),
    );
  }

  /**
   * Cập nhật spot + ticker WS. Ghi TokenCryptoLog chỉ khi `writeLog: true`
   * (vd khớp lệnh) — tránh log trùng / spam 0.01 làm nến sai (CHART_CANDLESTICK_SPEC).
   */
  async updatePrice(
    tokenId: string,
    currentPrice: number,
    options?: { writeLog?: boolean; logVolume?: number },
  ): Promise<TokenCrypto> {
    const price = assertPositiveSpotPrice(currentPrice, 'Giá spot');
    const token = await this.tokenRepository.findById(tokenId);

    if (!token) {
      throw new Error('Token not found');
    }

    // Tính toán giá cao nhất và thấp nhất trong ngày và mọi thời đại
    const highestPriceToday = Math.max(token.athPriceDay || 0, price);
    const allTimeHighPrice = Math.max(token.athPrice || 0, price);

    const lowestPriceToday =
      token.atlPriceDay != null
        ? Math.min(token.atlPriceDay, price)
        : token.price || price;

    const allTimeLowPrice =
      token.atlPrice != null
        ? Math.min(token.atlPrice, price)
        : token.price || price;

    const percentHighToday =
      highestPriceToday > 0
        ? ((highestPriceToday - price) / highestPriceToday) * 100
        : 0;

    const percentAllTimeHigh =
      allTimeHighPrice > 0
        ? ((allTimeHighPrice - price) / allTimeHighPrice) * 100
        : 0;

    const percentLowToday =
      lowestPriceToday > 0
        ? ((price - lowestPriceToday) / lowestPriceToday) * 100
        : 0;

    const percentAllTimeLow =
      allTimeLowPrice > 0
        ? ((price - allTimeLowPrice) / allTimeLowPrice) * 100
        : 0;

    const marketCap = deriveMarketCapKc(price, tokenSupplyForMarketCap(token));

    const updated = await this.tokenRepository.update(tokenId, {
      price,
      marketCap,
      athPriceDay: highestPriceToday,
      athPrice: allTimeHighPrice,
      atlPriceDay: lowestPriceToday,
      atlPrice: allTimeLowPrice,
      athPercentageDay: percentHighToday,
      athPercentage: percentAllTimeHigh,
      atlPercentageDay: percentLowToday,
      atlPercentage: percentAllTimeLow,
    });

    let volumesPayload: Record<string, number> | null = null;
    if (options?.writeLog) {
      const vol =
        options.logVolume != null &&
        Number.isFinite(options.logVolume) &&
        options.logVolume > 0
          ? options.logVolume
          : tradeVolumeKc(price, 0.01);
      await this.tokenLogService
        .createLog(tokenId, price, vol)
        .catch(() => undefined);
      volumesPayload = await this.syncVolumesFromLogs(tokenId).catch(
        () => null,
      );
    }

    const pct = await this.syncPriceChangePercents(tokenId, price);

    this.realtimeService.broadcastTicker(tokenId, {
      price: updated.price,
      marketCap: updated.marketCap,
      volumes: volumesPayload ?? updated.volumes,
      priceChange1h: pct.priceChange1h,
      priceChange24h: pct.priceChange24h,
      priceChange7d: pct.priceChange7d,
    });

    void this.updateRanks().catch((err) => {
      console.error('updateRanks after price:', err);
    });

    return {
      ...updated,
      ...(volumesPayload ? { volumes: volumesPayload } : {}),
      ...pct,
    };
  }

  /**
   * @desc Update a token
   * @param id
   * @param updateTokenCryptoDto
   * @returns Promise<TokenCrypto>
   */
  async update(
    id: string,
    updateTokenCryptoDto: Prisma.TokenCryptoUpdateInput,
  ): Promise<TokenCrypto> {
    const token = await this.tokenRepository.findById(id);
    if (!token) {
      throw new NotFoundException(`TokenCrypto with id ${id} not found`);
    }
    return this.tokenRepository.update(id, updateTokenCryptoDto);
  }

  async delete(id: string): Promise<void> {
    const token = await this.tokenRepository.findById(id);
    if (!token) {
      throw new NotFoundException(`TokenCrypto with id ${id} not found`);
    }
    await this.tokenRepository.delete(id);
  }
}
