import { PrismaService } from '@providers/prisma';
import { Injectable, Logger } from '@nestjs/common';
import { liquidityBotEmails } from './liquidity-bots.util';

@Injectable()
export class BotInventoryService {
  private readonly logger = new Logger(BotInventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  private quoteName(): string {
    return process.env.QUOTE_TOKEN_NAME ?? 'KingCoin';
  }

  private baseMin(): number {
    return Number(process.env.MARKET_MAKER_BASE_BALANCE ?? '5000000');
  }

  /** Đảm bảo user bot có Balance row. */
  private async ensureBotBalance(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { balance: true },
    });
    if (!user) return null;

    if (user.balance?.id) {
      return user.balance.id;
    }

    const balance = await this.prisma.balance.create({
      data: { userId, stableCoin: 0 },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { balanceId: balance.id },
    });
    return balance.id;
  }

  /**
   * Cấp `amount` token base cho một bot (tạo BalanceToken nếu chưa có).
   */
  /** Cộng KC quote cho bot MM (thanh khoản listing). */
  async creditKcToBot(email: string, amount: number): Promise<boolean> {
    const kc = Number(amount);
    if (!Number.isFinite(kc) || kc <= 0) return false;

    const quote = await this.prisma.tokenCrypto.findFirst({
      where: { name: this.quoteName() },
      select: { id: true },
    });
    if (!quote?.id) {
      this.logger.warn('Bot inventory: chưa có token quote KC');
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return false;

    const balanceId = await this.ensureBotBalance(user.id);
    if (!balanceId) return false;

    const row = await this.prisma.balanceToken.findFirst({
      where: { balanceId, tokenId: quote.id },
    });
    const current = row?.amount ?? 0;
    const next = current + kc;
    if (row) {
      await this.prisma.balanceToken.update({
        where: { id: row.id },
        data: { amount: next },
      });
    } else {
      await this.prisma.balanceToken.create({
        data: { balanceId, tokenId: quote.id, amount: next },
      });
    }
    this.logger.log(`Bot inventory: ${email} +${kc} KC (listing liquidity)`);
    return true;
  }

  /**
   * Seed thanh khoản niêm yết: token base + KC vào MM chính (không dùng 5M mặc định).
   */
  async creditListingLiquidityToMm(
    tokenId: string,
    tokenAmount: number,
    kcAmount: number,
  ): Promise<void> {
    const email =
      process.env.MARKET_MAKER_EMAIL ?? 'marketmaker@kingcoin.local';
    await this.creditTokenToBot(email, tokenId, tokenAmount);
    await this.creditKcToBot(email, kcAmount);
  }

  async creditTokenToBot(
    email: string,
    tokenId: string,
    amount?: number,
  ): Promise<boolean> {
    const min = amount ?? this.baseMin();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
    if (!user) {
      this.logger.warn(`Bot inventory: không tìm thấy ${email}`);
      return false;
    }

    const balanceId = await this.ensureBotBalance(user.id);
    if (!balanceId) {
      return false;
    }

    const row = await this.prisma.balanceToken.findFirst({
      where: { balanceId, tokenId },
    });
    const current = row?.amount ?? 0;
    if (current >= min) {
      return true;
    }

    if (row) {
      await this.prisma.balanceToken.update({
        where: { id: row.id },
        data: { amount: min },
      });
    } else {
      await this.prisma.balanceToken.create({
        data: { balanceId, tokenId, amount: min },
      });
    }

    this.logger.log(
      `Bot inventory: ${email} giữ ${min} token ${tokenId} (lưu hành MM)`,
    );
    return true;
  }

  /**
   * Sau khi tạo token mới: mọi bot MM/flow trong MARKET_MAKER_BOT_EMAILS
   * (hoặc MM + flow mặc định) đều nhận tối thiểu MARKET_MAKER_BASE_BALANCE.
   */
  async creditNewTokenToBots(tokenId: string): Promise<void> {
    const quote = await this.prisma.tokenCrypto.findFirst({
      where: { name: this.quoteName() },
      select: { id: true, tokenKind: true, symbol: true },
    });
    if (quote?.id === tokenId) {
      return;
    }
    if (quote?.tokenKind === 'stablecoin' && quote.id === tokenId) {
      return;
    }

    const token = await this.prisma.tokenCrypto.findUnique({
      where: { id: tokenId },
      select: { symbol: true, name: true },
    });
    if (!token) {
      return;
    }

    const emails = liquidityBotEmails();
    let ok = 0;
    for (const email of emails) {
      const credited = await this.creditTokenToBot(email, tokenId);
      if (credited) ok++;
    }

    if (ok < emails.length) {
      this.logger.warn(
        `Bot inventory: chỉ ${ok}/${emails.length} bot nhận ${token.symbol ?? tokenId} — chạy ensure-bot-inventory.js`,
      );
    } else {
      this.logger.log(
        `Bot inventory: ${emails.length} bot đã nắm ${token.name ?? tokenId} (${token.symbol})`,
      );
    }
  }

  /** Đồng bộ mọi token base cho một bot (giống script ensure-bot-inventory). */
  async syncBotInventory(email: string): Promise<void> {
    const quote = await this.prisma.tokenCrypto.findFirst({
      where: { name: this.quoteName() },
    });
    const quoteId = quote?.id ?? null;
    const tokens = await this.prisma.tokenCrypto.findMany({
      select: { id: true },
    });
    for (const t of tokens) {
      if (quoteId && t.id === quoteId) continue;
      await this.creditTokenToBot(email, t.id);
    }
  }
}
