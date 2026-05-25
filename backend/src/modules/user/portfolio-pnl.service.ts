import { unrealizedPnlKc } from '@modules/futures/futures-math.util';
import { UserRepository } from '@modules/user/user.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { USER_NOT_FOUND_KC } from '@constants/errors.constants';
import { PrismaService } from '@providers/prisma';
import {
  FuturesPositionStatus,
  User,
  WalletPool,
} from '@prisma/client';

/** Đầu ngày / đầu tuần (UTC, thứ Hai = đầu tuần). */
function startOfUtcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function startOfUtcWeek(now = new Date()): Date {
  const d = startOfUtcDay(now);
  const dow = d.getUTCDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d;
}

/**
 * PnL hiển thị = thay đổi NAV (KC) so với mốc đầu ngày / đầu tuần — không phải tổng KC đã chi khi mua.
 * @see docs/STABLECOIN_KC_SPEC.md, docs/ACCOUNT_PROFILE_DASHBOARD_SPEC.md
 */
@Injectable()
export class PortfolioPnlService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
  ) {}

  /** Vốn futures = KC rảnh ví futures + Σ (ký quỹ + uPnL) từng vị thế mở. */
  async computeFuturesEquityKc(userId: string): Promise<number> {
    const free = await this.userRepository.getWalletKc(
      userId,
      WalletPool.futures,
    );
    const open = await this.prisma.futuresPosition.findMany({
      where: { userId, status: FuturesPositionStatus.open },
      select: {
        side: true,
        size: true,
        entryPrice: true,
        marginKc: true,
        tokenId: true,
      },
    });

    let lockedEquity = 0;
    for (const p of open) {
      const token = await this.prisma.tokenCrypto.findUnique({
        where: { id: p.tokenId },
        select: { price: true },
      });
      const mark =
        token?.price != null && token.price > 0
          ? token.price
          : p.entryPrice;
      const u = unrealizedPnlKc(
        p.side,
        p.size,
        p.entryPrice,
        mark,
      );
      lockedEquity += p.marginKc + u;
    }

    return Number((free + lockedEquity).toFixed(8));
  }

  /** Giá trị alt spot (KC), không gồm quote / ví futures / funding. */
  async computeSpotAltValueKc(userId: string): Promise<number> {
    const quoteId = await this.userRepository.getQuoteTokenId();
    const balance = await this.prisma.balance.findUnique({
      where: { userId },
      include: { tokens: true },
    });

    let altValue = 0;
    for (const row of balance?.tokens ?? []) {
      if (!row.tokenId || row.tokenId === quoteId || row.amount <= 1e-12) {
        continue;
      }
      const token = await this.prisma.tokenCrypto.findUnique({
        where: { id: row.tokenId },
        select: { price: true },
      });
      const px = token?.price;
      if (px != null && px > 0) {
        altValue += row.amount * px;
      }
    }

    return Number(altValue.toFixed(8));
  }

  /**
   * NAV = spot KC + alt (giá spot) + funding + vốn futures (ký quỹ + uPnL mở).
   * @see docs/STABLECOIN_KC_SPEC.md
   */
  async computeNavKc(userId: string): Promise<number> {
    const quoteKc = await this.userRepository.getQuoteBalance(userId);
    const fundingKc = await this.userRepository.getWalletKc(
      userId,
      WalletPool.funding,
    );
    const [altValue, futuresEquity] = await Promise.all([
      this.computeSpotAltValueKc(userId),
      this.computeFuturesEquityKc(userId),
    ]);

    return Number(
      (quoteKc + altValue + fundingKc + futuresEquity).toFixed(8),
    );
  }

  /**
   * Cập nhật dailyPnL / weeklyPnL và % từ NAV hiện tại vs baseline.
   * Gọi sau GET /users/me và sau khớp lệnh.
   */
  async syncUserNavPnL(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND_KC);
    }

    const nav = await this.computeNavKc(userId);
    const now = new Date();
    const dayStart = startOfUtcDay(now);
    const weekStart = startOfUtcWeek(now);

    let dayBaseline = user.navBaselineDayKc ?? 0;
    let weekBaseline = user.navBaselineWeekKc ?? 0;
    let dayAt = user.navBaselineDayAt;
    let weekAt = user.navBaselineWeekAt;

    if (!dayAt || dayAt < dayStart) {
      dayBaseline = nav;
      dayAt = now;
    }
    if (!weekAt || weekAt < weekStart) {
      weekBaseline = nav;
      weekAt = now;
    }

    const dailyPnL = Number((nav - dayBaseline).toFixed(8));
    const weeklyPnL = Number((nav - weekBaseline).toFixed(8));
    const dailyPnLPercent =
      dayBaseline > 1e-8
        ? Number(((dailyPnL / dayBaseline) * 100).toFixed(4))
        : 0;
    const weeklyPnLPercent =
      weekBaseline > 1e-8
        ? Number(((weeklyPnL / weekBaseline) * 100).toFixed(4))
        : 0;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        navBaselineDayKc: dayBaseline,
        navBaselineWeekKc: weekBaseline,
        navBaselineDayAt: dayAt,
        navBaselineWeekAt: weekAt,
        dailyPnL,
        weeklyPnL,
        dailyPnLPercent,
        weeklyPnLPercent,
      },
    });
  }
}
