import { Injectable } from '@nestjs/common';
import { ListingRequest, Prisma } from '@prisma/client';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class ListingRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ListingRequestCreateInput): Promise<ListingRequest> {
    return this.prisma.listingRequest.create({ data });
  }

  findById(id: string): Promise<ListingRequest | null> {
    return this.prisma.listingRequest.findUnique({ where: { id } });
  }

  findByUserId(userId: string): Promise<ListingRequest[]> {
    return this.prisma.listingRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByStatus(status: string): Promise<ListingRequest[]> {
    return this.prisma.listingRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
    });
  }

  findPendingSymbol(symbol: string): Promise<ListingRequest | null> {
    return this.prisma.listingRequest.findFirst({
      where: {
        symbol: { equals: symbol, mode: 'insensitive' },
        status: { in: ['pending', 'approved'] },
      },
    });
  }

  update(
    id: string,
    data: Prisma.ListingRequestUpdateInput,
  ): Promise<ListingRequest> {
    return this.prisma.listingRequest.update({ where: { id }, data });
  }
}
