import { OrderRepository } from '@modules/order/order.repository';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class MarkPriceService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly tokenCryptoService: TokenCryptoService,
  ) {}

  /** Lệch tối đa (tỷ lệ) giữa mid sổ lệnh và giá spot DB trước khi ưu tiên spot (admin neo). */
  private static readonly SPOT_ANCHOR_DRIFT = 0.015;

  async getMarkPrice(tokenId: string): Promise<number> {
    const token = await this.tokenCryptoService.findOne(tokenId);
    const spot = Number(token?.price ?? 0);

    const buys = await this.orderRepository.findPendingBuyOrders(tokenId);
    const sells = await this.orderRepository.findPendingSellOrders(tokenId);
    const bid = buys[0]?.price != null ? Number(buys[0].price) : null;
    const ask = sells[0]?.price != null ? Number(sells[0].price) : null;

    let bookMid: number | null = null;
    if (bid != null && bid > 0 && ask != null && ask > 0) {
      bookMid = (bid + ask) / 2;
    } else if (bid != null && bid > 0) {
      bookMid = bid;
    } else if (ask != null && ask > 0) {
      bookMid = ask;
    }

    if (spot > 0 && bookMid != null && bookMid > 0) {
      const drift = Math.abs(bookMid - spot) / spot;
      if (drift > MarkPriceService.SPOT_ANCHOR_DRIFT) {
        return spot;
      }
      return bookMid;
    }
    if (bookMid != null && bookMid > 0) {
      return bookMid;
    }
    if (spot > 0) {
      return spot;
    }
    throw new NotFoundException('Chưa có giá mark cho token này.');
  }
}
