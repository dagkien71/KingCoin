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
      perPage: 10,
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
  ): Promise<PaginatorTypes.PaginatedResult<TokenCrypto>> {
    return this.paginate(this.prisma.tokenCrypto, {
      where,
      orderBy,
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

    // Update the tokenCrypto
    return this.prisma.tokenCrypto.update({
      where: { id },
      data,
    });
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
