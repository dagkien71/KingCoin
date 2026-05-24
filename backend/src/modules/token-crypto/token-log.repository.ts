import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { Prisma, TokenCryptoLog } from '@prisma/client';

@Injectable()
export class TokenCryptoLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Create a new crypto log for token
  async create(
    data: Prisma.TokenCryptoLogCreateInput,
  ): Promise<TokenCryptoLog> {
    return this.prisma.tokenCryptoLog.create({
      data,
    });
  }

  // Find a log by its ID
  findById(id: string): Promise<TokenCryptoLog> {
    return this.prisma.tokenCryptoLog.findUnique({
      where: { id },
    });
  }

  // Find all logs for a specific token
  findMany(
    params: Prisma.TokenCryptoLogFindManyArgs,
  ): Promise<TokenCryptoLog[]> {
    return this.prisma.tokenCryptoLog.findMany(params);
  }

  findFirst(
    params: Prisma.TokenCryptoLogFindFirstArgs,
  ): Promise<TokenCryptoLog | null> {
    return this.prisma.tokenCryptoLog.findFirst(params);
  }

  // Update a token crypto log
  async update(
    id: string,
    data: Prisma.TokenCryptoLogUpdateInput,
  ): Promise<TokenCryptoLog> {
    return this.prisma.tokenCryptoLog.update({
      where: { id },
      data,
    });
  }

  // Delete a token crypto log
  async delete(id: string): Promise<void> {
    await this.prisma.tokenCryptoLog.delete({
      where: { id },
    });
  }
}
