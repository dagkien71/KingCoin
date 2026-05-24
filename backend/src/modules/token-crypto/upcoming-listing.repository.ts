import { Injectable } from '@nestjs/common';
import { Prisma, UpcomingListing } from '@prisma/client';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class UpcomingListingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActive(now = new Date()): Promise<UpcomingListing[]> {
    return this.prisma.upcomingListing.findMany({
      where: {
        listingAt: { gt: now },
        status: { in: ['scheduled', 'announced'] },
      },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { listingAt: 'asc' }],
    });
  }

  findByKey(key: string): Promise<UpcomingListing | null> {
    const k = key.trim();
    if (!k) return Promise.resolve(null);
    return this.prisma.upcomingListing.findFirst({
      where: {
        OR: [
          { id: k },
          { symbol: { equals: k, mode: 'insensitive' } },
        ],
        listingAt: { gt: new Date() },
        status: { in: ['scheduled', 'announced', 'review'] },
      },
    });
  }

  countPreorders(upcomingListingId: string): Promise<number> {
    return this.prisma.upcomingListingPreorder.count({
      where: { upcomingListingId },
    });
  }

  sumPreorderKc(upcomingListingId: string): Promise<number> {
    return this.prisma.upcomingListingPreorder
      .aggregate({
        where: { upcomingListingId },
        _sum: { amountKc: true },
      })
      .then((r) => r._sum.amountKc ?? 0);
  }

  findPreorder(userId: string, upcomingListingId: string) {
    return this.prisma.upcomingListingPreorder.findUnique({
      where: {
        userId_upcomingListingId: { userId, upcomingListingId },
      },
    });
  }

  upsertPreorder(
    userId: string,
    upcomingListingId: string,
    amountKc: number,
  ) {
    return this.prisma.upcomingListingPreorder.upsert({
      where: {
        userId_upcomingListingId: { userId, upcomingListingId },
      },
      create: { userId, upcomingListingId, amountKc },
      update: { amountKc },
    });
  }

  deletePreorder(userId: string, upcomingListingId: string) {
    return this.prisma.upcomingListingPreorder.deleteMany({
      where: { userId, upcomingListingId },
    });
  }

  findDueForGoLive(now = new Date()): Promise<UpcomingListing[]> {
    return this.prisma.upcomingListing.findMany({
      where: {
        listingAt: { lte: now },
        listingRequestId: { not: null },
      },
    });
  }

  create(data: Prisma.UpcomingListingCreateInput): Promise<UpcomingListing> {
    return this.prisma.upcomingListing.create({ data });
  }

  deleteById(id: string): Promise<void> {
    return this.prisma.upcomingListing.delete({ where: { id } }).then(() => undefined);
  }

  upsertMany(rows: Prisma.UpcomingListingCreateInput[]): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.upcomingListing.deleteMany({});
      if (!rows.length) return 0;
      await tx.upcomingListing.createMany({
        data: rows.map((r) => ({
          name: r.name,
          symbol: r.symbol,
          logo: r.logo,
          tagline: r.tagline,
          description: r.description,
          status: r.status ?? 'scheduled',
          listingAt:
            r.listingAt instanceof Date
              ? r.listingAt
              : new Date(r.listingAt as string),
          initialPrice: r.initialPrice,
          totalSupply: r.totalSupply,
          category: r.category,
          features: r.features ?? [],
          specs: r.specs ?? undefined,
          sortOrder: r.sortOrder ?? 0,
          isFeatured: r.isFeatured ?? false,
        })),
      });
      return rows.length;
    });
  }
}
