import { Injectable } from '@nestjs/common';
import { paginator, PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, TradeFill } from '@prisma/client';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class TradeFillRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    this.paginate = paginator({ page: 1, perPage: 50 });
  }

  create(data: Prisma.TradeFillCreateInput): Promise<TradeFill> {
    return this.prisma.tradeFill.create({ data });
  }

  findAll(
    where: Prisma.TradeFillWhereInput,
    orderBy?: Prisma.TradeFillOrderByWithRelationInput,
  ): Promise<PaginatorTypes.PaginatedResult<TradeFill>> {
    return this.paginate(this.prisma.tradeFill, {
      where,
      orderBy: orderBy ?? { createdAt: 'desc' },
    });
  }

  findMany(
    where: Prisma.TradeFillWhereInput,
    take = 100,
  ): Promise<TradeFill[]> {
    return this.prisma.tradeFill.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
