import { Injectable } from '@nestjs/common';
import { AuthTokenPurpose } from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { createHash, randomInt } from 'crypto';

const CODE_LENGTH = 6;
const DEFAULT_TTL_MIN: Record<AuthTokenPurpose, number> = {
  email_verify: 15,
  password_reset: 15,
};

@Injectable()
export class AuthTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  private hashCode(code: string): string {
    return createHash('sha256').update(code.trim()).digest('hex');
  }

  generateCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(CODE_LENGTH, '0');
  }

  async issue(
    userId: string,
    purpose: AuthTokenPurpose,
    ttlMinutes = DEFAULT_TTL_MIN[purpose] ?? 15,
  ): Promise<string> {
    const code = this.generateCode();
    const ttl = Number.isFinite(ttlMinutes) ? ttlMinutes : 15;
    const expiresAt = new Date(Date.now() + ttl * 60_000);
    await this.prisma.authToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: this.hashCode(code),
        expiresAt,
      },
    });
    return code;
  }

  async consume(
    userId: string,
    purpose: AuthTokenPurpose,
    code: string,
  ): Promise<boolean> {
    const row = await this.prisma.authToken.findFirst({
      where: {
        userId,
        purpose,
        tokenHash: this.hashCode(code),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return false;
    await this.prisma.authToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    return true;
  }

  async findUserIdByEmailPurpose(
    email: string,
    purpose: AuthTokenPurpose,
  ): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user?.id ?? null;
  }
}
