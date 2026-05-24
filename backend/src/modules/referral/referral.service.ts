import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { randomBytes } from 'crypto';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(private readonly prisma: PrismaService) {}

  private publicBaseUrl(): string {
    return (
      process.env.APP_PUBLIC_URL?.replace(/\/$/, '') ??
      'http://localhost:3000'
    );
  }

  private maxReferralsPerMonth(): number {
    return Number(process.env.REFERRAL_MAX_PER_MONTH ?? '20') || 20;
  }

  private async generateUniqueCode(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code =
        'KC' + randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
      const exists = await this.prisma.referralCode.findUnique({
        where: { code },
      });
      if (!exists) return code;
    }
    throw new BadRequestException('Không tạo được mã giới thiệu, thử lại.');
  }

  async ensureCodeForUser(userId: string): Promise<{ code: string }> {
    const existing = await this.prisma.referralCode.findUnique({
      where: { userId },
    });
    if (existing) return { code: existing.code };
    const code = await this.generateUniqueCode();
    await this.prisma.referralCode.create({
      data: { userId, code },
    });
    return { code };
  }

  async getReferralStats(userId: string): Promise<{
    code: string;
    link: string;
    totalReferees: number;
    qualifiedReferees: number;
  }> {
    const { code } = await this.ensureCodeForUser(userId);
    const link = `${this.publicBaseUrl()}/register?ref=${encodeURIComponent(code)}`;
    const attributions = await this.prisma.referralAttribution.findMany({
      where: { referrerId: userId },
      select: { refereeId: true },
    });
    const qualified = await this.countQualifiedReferrals(userId);
    return {
      code,
      link,
      totalReferees: attributions.length,
      qualifiedReferees: qualified,
    };
  }

  async countQualifiedReferrals(referrerId: string): Promise<number> {
    const refs = await this.prisma.referralAttribution.findMany({
      where: { referrerId },
      select: { refereeId: true },
    });
    if (!refs.length) return 0;
    const ids = refs.map((r) => r.refereeId);
    const withOrder = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: ids } },
    });
    return withOrder.length;
  }

  async wasReferred(userId: string): Promise<boolean> {
    const row = await this.prisma.referralAttribution.findUnique({
      where: { refereeId: userId },
    });
    return Boolean(row);
  }

  async attachOnSignup(
    refereeId: string,
    referralCodeRaw?: string,
  ): Promise<void> {
    const referralCode = referralCodeRaw?.trim().toUpperCase();
    if (!referralCode) return;

    const refRow = await this.prisma.referralCode.findUnique({
      where: { code: referralCode },
    });
    if (!refRow) {
      this.logger.warn(`Mã giới thiệu không hợp lệ: ${referralCode}`);
      return;
    }
    if (refRow.userId === refereeId) {
      throw new BadRequestException('Không thể dùng mã giới thiệu của chính bạn.');
    }

    const existing = await this.prisma.referralAttribution.findUnique({
      where: { refereeId },
    });
    if (existing) return;

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const countMonth = await this.prisma.referralAttribution.count({
      where: {
        referrerId: refRow.userId,
        createdAt: { gte: monthStart },
      },
    });
    if (countMonth >= this.maxReferralsPerMonth()) {
      this.logger.warn(
        `Referrer ${refRow.userId} vượt cap tháng (${countMonth})`,
      );
      return;
    }

    await this.prisma.referralAttribution.create({
      data: {
        referrerId: refRow.userId,
        refereeId,
      },
    });
  }
}
