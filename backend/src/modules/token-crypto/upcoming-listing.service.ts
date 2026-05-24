import { UserRepository } from '@modules/user/user.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpcomingListing } from '@prisma/client';
import { UpcomingListingRepository } from './upcoming-listing.repository';

export type UpcomingListingDetail = {
  listing: UpcomingListing;
  preorderCount: number;
  totalPreorderKc: number;
  myPreorder: { amountKc: number } | null;
};

@Injectable()
export class UpcomingListingService {
  constructor(
    private readonly repo: UpcomingListingRepository,
    private readonly userRepo: UserRepository,
  ) {}

  listUpcoming(): Promise<UpcomingListing[]> {
    return this.repo.findActive();
  }

  async getDetail(
    key: string,
    userId?: string,
  ): Promise<UpcomingListingDetail> {
    const listing = await this.repo.findByKey(key);
    if (!listing) {
      throw new NotFoundException('Không tìm thấy token sắp niêm yết.');
    }
    const [preorderCount, totalPreorderKc] = await Promise.all([
      this.repo.countPreorders(listing.id),
      this.repo.sumPreorderKc(listing.id),
    ]);
    let myPreorder: { amountKc: number } | null = null;
    if (userId) {
      const row = await this.repo.findPreorder(userId, listing.id);
      if (row) myPreorder = { amountKc: row.amountKc };
    }
    return { listing, preorderCount, totalPreorderKc, myPreorder };
  }

  async placePreorder(
    key: string,
    userId: string,
    amountKc: number,
  ): Promise<{ amountKc: number }> {
    const listing = await this.repo.findByKey(key);
    if (!listing) {
      throw new NotFoundException('Không tìm thấy token sắp niêm yết.');
    }
    if (amountKc <= 0) {
      throw new BadRequestException('Số KC đặt trước phải lớn hơn 0.');
    }
    const balance = await this.userRepo.getQuoteBalance(userId);
    if (balance < amountKc - 1e-9) {
      throw new BadRequestException(
        `Không đủ KC. Cần ${amountKc} KC trong ví, hiện có ${balance.toFixed(4)} KC.`,
      );
    }
    await this.repo.upsertPreorder(userId, listing.id, amountKc);
    return { amountKc };
  }

  async cancelPreorder(key: string, userId: string): Promise<void> {
    const listing = await this.repo.findByKey(key);
    if (!listing) {
      throw new NotFoundException('Không tìm thấy token sắp niêm yết.');
    }
    await this.repo.deletePreorder(userId, listing.id);
  }
}
