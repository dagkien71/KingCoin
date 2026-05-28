import { PrismaService } from '@providers/prisma';
import { Injectable, NotFoundException } from '@nestjs/common';
import { TOKEN_NOT_FOUND } from '@constants/errors.constants';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, TokenCrypto } from '@prisma/client';

@Injectable()
export class TokenCryptoRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    /**
     * @desc Create a paginate function
     * @param model
     * @param options
     * @returns Promise<PaginatorTypes.PaginatedResult<T>>
     */
    this.paginate = paginator({
      page: 1,
      perPage: 50,
    });
  }

  findById(id: string): Promise<TokenCrypto> {
    return this.prisma.tokenCrypto.findUnique({
      where: { id },
    });
  }

  findMany(params: Prisma.TokenCryptoFindManyArgs): Promise<TokenCrypto[]> {
    return this.prisma.tokenCrypto.findMany(params);
  }

  /**
   * @desc Find a tokenCrypto by params
   * @param params Prisma.TokenCryptoFindFirstArgs
   * @returns Promise<TokenCrypto | null>
   *       If the tokenCrypto is not found, return null
   */
  async findOne(
    params: Prisma.TokenCryptoFindFirstArgs,
  ): Promise<TokenCrypto | null> {
    return this.prisma.tokenCrypto.findFirst(params);
  }

  /**
   * @desc Create a new tokenCrypto
   * @param data Prisma.TokenCryptoCreateInput
   * @returns Promise<TokenCrypto>
   */
  async create(data: Prisma.TokenCryptoCreateInput): Promise<TokenCrypto> {
    return this.prisma.tokenCrypto.create({
      data,
    });
  }

  /**
   * @desc Find all tokenCryptos with pagination
   * @param where Prisma.TokenCryptoWhereInput
   * @param orderBy Prisma.TokenCryptoOrderByWithRelationInput
   * @returns Promise<PaginatorTypes.PaginatedResult<TokenCrypto>>
   */
  async findAll(
    where: Prisma.TokenCryptoWhereInput,
    orderBy: Prisma.TokenCryptoOrderByWithRelationInput,
    pagination?: { page?: number; perPage?: number },
  ): Promise<PaginatorTypes.PaginatedResult<TokenCrypto>> {
    return this.paginate(
      this.prisma.tokenCrypto,
      { where, orderBy },
      pagination,
    );
  }

  /** Một lần lấy tối đa `max` token — dùng cho /token-crypto/all và cron. */
  async findListed(
    where: Prisma.TokenCryptoWhereInput,
    orderBy: Prisma.TokenCryptoOrderByWithRelationInput,
    max: number,
  ): Promise<TokenCrypto[]> {
    return this.prisma.tokenCrypto.findMany({
      where,
      orderBy,
      take: max,
    });
  }

  async update(
    id: string,
    data: Prisma.TokenCryptoUpdateInput,
  ): Promise<TokenCrypto> {
    // Check if the token exists
    const tokenCrypto = await this.prisma.tokenCrypto.findUnique({
      where: { id },
    });

    if (!tokenCrypto) {
      throw new NotFoundException(TOKEN_NOT_FOUND);
    }

    // Update the tokenCrypto (Mongo may hit P2034 write conflicts under load).
    const maxRetry = 6;
    for (let attempt = 0; attempt <= maxRetry; attempt++) {
      try {
        return await this.prisma.tokenCrypto.update({
          where: { id },
          data,
        });
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code !== 'P2034' || attempt === maxRetry) {
          throw err;
        }
        const delayMs = Math.min(800, 35 * 2 ** attempt);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    // unreachable
    throw new Error('tokenCrypto.update retry exhausted');
  }

  async delete(id: string): Promise<void> {
    const tokenCrypto = await this.prisma.tokenCrypto.findUnique({
      where: { id },
    });

    if (!tokenCrypto) {
      throw new NotFoundException(TOKEN_NOT_FOUND);
    }

    await this.prisma.tokenCrypto.delete({
      where: { id },
    });
  }
}
