import { OrderRepository } from '@modules/order/order.repository';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class MarkPriceService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly tokenCryptoService: TokenCryptoService,
  ) {}

  async getMarkPrice(tokenId: string): Promise<number> {
    const buys = await this.orderRepository.findPendingBuyOrders(tokenId);
    const sells = await this.orderRepository.findPendingSellOrders(tokenId);
    const bid = buys[0]?.price != null ? Number(buys[0].price) : null;
    const ask = sells[0]?.price != null ? Number(sells[0].price) : null;

    if (bid != null && bid > 0 && ask != null && ask > 0) {
      return (bid + ask) / 2;
    }
    if (bid != null && bid > 0) return bid;
    if (ask != null && ask > 0) return ask;

    const token = await this.tokenCryptoService.findOne(tokenId);
    const last = Number(token?.price ?? 0);
    if (last <= 0) {
      throw new NotFoundException('Chưa có giá mark cho token này.');
    }
    return last;
  }
}
