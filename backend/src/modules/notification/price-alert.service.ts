import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { NotificationService } from '@modules/notification/notification.service';
import {
  futuresDeeplink,
  tradeDeeplink,
} from '../../common/token-route.util';
import {
  NotificationPriority,
  NotificationType,
  PriceAlertDirection,
  PriceAlertMarketKind,
  Prisma,
} from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isPriceAlertTriggered } from '@modules/notification/price-alert-trigger.util';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class PriceAlertService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly notifications: NotificationService,
  ) {}

  async listForUser(userId: string, tokenId?: string) {
    const where: Prisma.PriceAlertWhereInput = { userId, active: true };
    if (tokenId) where.tokenId = tokenId;
    return this.prisma.priceAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    userId: string,
    data: {
      tokenId: string;
      marketKind?: PriceAlertMarketKind;
      direction: PriceAlertDirection;
      targetPrice: number;
    },
  ) {
    const targetPrice = Number(data.targetPrice);
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      throw new BadRequestException('Giá mục tiêu phải dương.');
    }
    const token = await this.tokenCrypto.findOne(data.tokenId);
    if (!token) throw new NotFoundException('Token không tồn tại.');

    const count = await this.prisma.priceAlert.count({
      where: { userId, active: true },
    });
    if (count >= 50) {
      throw new BadRequestException('Tối đa 50 cảnh báo giá đang hoạt động.');
    }

    return this.prisma.priceAlert.create({
      data: {
        userId,
        tokenId: data.tokenId,
        marketKind: data.marketKind ?? PriceAlertMarketKind.spot,
        direction: data.direction,
        targetPrice,
      },
    });
  }

  async remove(userId: string, id: string) {
    const row = await this.prisma.priceAlert.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException('Không tìm thấy cảnh báo.');
    await this.prisma.priceAlert.delete({ where: { id } });
  }

  async scanAndTrigger(): Promise<number> {
    const alerts = await this.prisma.priceAlert.findMany({
      where: { active: true },
      take: 500,
    });
    let triggered = 0;
    for (const alert of alerts) {
      try {
        const price = await this.currentPrice(
          alert.tokenId,
          alert.marketKind,
        );
        if (price == null || price <= 0) continue;

        if (
          !isPriceAlertTriggered(
            alert.direction,
            price,
            alert.targetPrice,
          )
        ) {
          continue;
        }

        const token = await this.tokenCrypto.findOne(alert.tokenId);
        const sym = token?.symbol ?? token?.name ?? 'Token';
        const deeplink =
          alert.marketKind === PriceAlertMarketKind.futures
            ? futuresDeeplink(token?.symbol, token?.name, alert.tokenId)
            : tradeDeeplink(token?.symbol, token?.name, alert.tokenId);

        await this.notifications.notify({
          userId: alert.userId,
          type: NotificationType.PRICE_ALERT,
          priority: NotificationPriority.high,
          title: `Cảnh báo giá ${sym}`,
          body: `${sym} ${alert.direction === PriceAlertDirection.above ? '≥' : '≤'} ${alert.targetPrice.toFixed(4)} KC (hiện ${price.toFixed(4)})`,
          dedupeKey: `PRICE_ALERT:${alert.id}`,
          payload: {
            deeplink,
            tokenId: alert.tokenId,
            symbol: sym,
            targetPrice: alert.targetPrice,
            currentPrice: price,
            marketKind: alert.marketKind,
            alertId: alert.id,
          },
        });

        await this.prisma.priceAlert.update({
          where: { id: alert.id },
          data: { active: false, triggeredAt: new Date() },
        });
        triggered += 1;
      } catch {
        /* skip broken token */
      }
    }
    return triggered;
  }

  private async currentPrice(
    tokenId: string,
    _kind: PriceAlertMarketKind,
  ): Promise<number | null> {
    const t = await this.tokenCrypto.findOne(tokenId);
    const price = t?.price;
    return price != null && price > 0 ? price : null;
  }
}
