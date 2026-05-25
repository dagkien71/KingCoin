import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  orderbookChannel(tokenId: string): string {
    return `orderbook:${tokenId}`;
  }

  tradesChannel(tokenId: string): string {
    return `trades:${tokenId}`;
  }

  tickerChannel(tokenId: string): string {
    return `ticker:${tokenId}`;
  }

  marketsChannel(): string {
    return 'markets';
  }

  broadcastTicker(
    tokenId: string,
    payload: Record<string, unknown>,
  ): void {
    this.emitTickerFast(tokenId, payload);
  }

  /** WS only — không ghi DB (Realtime V2 hot path). */
  emitTickerFast(
    tokenId: string,
    payload: Record<string, unknown>,
  ): void {
    this.gateway.emitToChannel(this.tickerChannel(tokenId), 'ticker', {
      tokenId,
      at: Date.now(),
      ...payload,
    });
    this.gateway.emitToChannel(this.marketsChannel(), 'markets', {
      tokenId,
      at: Date.now(),
      ...payload,
    });
  }

  broadcastOrderbook(tokenId: string): void {
    this.gateway.emitToChannel(this.orderbookChannel(tokenId), 'orderbook', {
      tokenId,
      at: Date.now(),
    });
  }

  broadcastTrade(
    tokenId: string,
    payload: Record<string, unknown>,
  ): void {
    this.gateway.emitToChannel(
      this.tradesChannel(tokenId),
      'trade',
      payload,
    );
    this.broadcastOrderbook(tokenId);
  }

  userChannel(userId: string): string {
    return `user:${userId}`;
  }

  emitUserNotification(
    userId: string,
    payload: Record<string, unknown>,
  ): void {
    this.gateway.emitToChannel(
      this.userChannel(userId),
      'notification',
      payload,
    );
  }

  squareFeedChannel(): string {
    return 'square:feed';
  }

  emitSquareFeed(event: string, payload: Record<string, unknown>): void {
    this.gateway.emitToChannel(this.squareFeedChannel(), event, payload);
  }

  emitUserSquareEvent(
    userId: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    this.gateway.emitToChannel(this.userChannel(userId), event, payload);
  }

  emitToChannel(
    channel: string,
    event: string,
    payload: Record<string, unknown>,
  ): void {
    this.gateway.emitToChannel(channel, event, payload);
  }
}
