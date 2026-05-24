import { NotificationService } from '@modules/notification/notification.service';
import { UserRepository } from '@modules/user/user.repository';
import { LedgerService } from '@modules/ledger/ledger.service';
import { assertPositiveSpotPrice } from '../../common/spot-price.util';
import { ListingRequestRepository } from './listing-request.repository';
import { UpcomingListingRepository } from './upcoming-listing.repository';
import { TokenCryptoRepository } from './token.repository';
import { TokenCryptoService } from './token.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingRequest,
  NotificationPriority,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { ApproveListingRequestDto } from './dto/approve-listing-request.dto';

type SubmitPayload = {
  name: string;
  symbol: string;
  logo?: string | null;
  decimals?: number;
  totalSupply: number;
  initialPrice?: number;
  description?: string;
  communityLinks?: Prisma.InputJsonValue;
  circulatingSupply?: number;
};

@Injectable()
export class ListingRequestService {
  constructor(
    private readonly repo: ListingRequestRepository,
    private readonly upcomingRepo: UpcomingListingRepository,
    private readonly tokenRepo: TokenCryptoRepository,
    private readonly userRepo: UserRepository,
    private readonly ledgerService: LedgerService,
    private readonly tokenService: TokenCryptoService,
    private readonly notifications: NotificationService,
  ) {}

  private listingFee(): number {
    return Number(process.env.TOKEN_LISTING_FEE_KC ?? '1000');
  }

  async submit(userId: string, payload: SubmitPayload): Promise<ListingRequest> {
    const symbol = payload.symbol.trim().toUpperCase();
    if (!symbol) {
      throw new BadRequestException('Symbol không hợp lệ.');
    }

    const existingToken = await this.tokenRepo.findOne({
      where: {
        OR: [
          { symbol: { equals: symbol, mode: 'insensitive' } },
          { name: { equals: payload.name.trim(), mode: 'insensitive' } },
        ],
      },
    });
    if (existingToken) {
      throw new BadRequestException(
        'Tên hoặc symbol đã tồn tại trên sàn.',
      );
    }

    const pending = await this.repo.findPendingSymbol(symbol);
    if (pending) {
      throw new BadRequestException(
        'Symbol đang có yêu cầu niêm yết chờ duyệt.',
      );
    }

    if (payload.initialPrice != null) {
      assertPositiveSpotPrice(Number(payload.initialPrice), 'Giá khởi điểm');
    }

    const listingFee = this.listingFee();
    if (listingFee > 0) {
      const kc = await this.userRepo.getQuoteBalance(userId);
      if (kc < listingFee - 1e-9) {
        throw new BadRequestException(
          `Không đủ KC. Cần ${listingFee} KC, hiện có ${kc.toFixed(4)} KC.`,
        );
      }
      const quoteId = await this.userRepo.getQuoteTokenId();
      if (quoteId) {
        await this.userRepo.adjustBalanceTokenByUserId(
          userId,
          quoteId,
          -listingFee,
        );
      } else {
        await this.userRepo.adjustStableCoinByUserId(userId, -listingFee);
      }
    }

    const request = await this.repo.create({
      userId,
      name: payload.name.trim(),
      symbol,
      logo: payload.logo ?? null,
      decimals: payload.decimals ?? 6,
      totalSupply: payload.totalSupply,
      initialPrice: payload.initialPrice ?? null,
      description: payload.description ?? null,
      communityLinks: payload.communityLinks ?? undefined,
      status: 'pending',
      listingFeeKc: listingFee,
    });

    if (listingFee > 0) {
      const quoteId = await this.userRepo.getQuoteTokenId();
      await this.ledgerService.append({
        userId,
        amount: -listingFee,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType: 'listing_fee',
        refId: request.id,
        note: `Phí yêu cầu niêm yết ${symbol}`,
      });
      await this.notifications.notify({
        userId,
        type: NotificationType.LISTING_FEE,
        priority: NotificationPriority.normal,
        title: 'Phí yêu cầu niêm yết',
        body: `Đã trừ ${listingFee} KC — ${symbol} đang chờ admin duyệt.`,
        dedupeKey: `LISTING_FEE:${request.id}`,
        payload: {
          deeplink: '/issuer/tokens',
          requestId: request.id,
          symbol,
          amountKc: listingFee,
        },
      });
    }

    await this.notifications.notifyAdmins({
      type: NotificationType.LISTING_REQUEST_SUBMITTED,
      priority: NotificationPriority.high,
      title: 'Yêu cầu niêm yết mới',
      body: `${symbol} (${payload.name}) — chờ duyệt & chọn ngày list.`,
      dedupeKey: `LISTING_REQUEST_SUBMITTED:${request.id}`,
      payload: {
        deeplink: '/admin/listing-requests',
        requestId: request.id,
        symbol,
        userId,
      },
    });

    return request;
  }

  listMine(userId: string): Promise<ListingRequest[]> {
    return this.repo.findByUserId(userId);
  }

  listPending(): Promise<ListingRequest[]> {
    return this.repo.findByStatus('pending');
  }

  async approve(
    id: string,
    adminId: string,
    dto: ApproveListingRequestDto,
  ): Promise<ListingRequest> {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu.');
    if (request.status !== 'pending') {
      throw new BadRequestException('Yêu cầu không ở trạng thái chờ duyệt.');
    }

    const listingAt = new Date(dto.listingAt);
    if (!Number.isFinite(listingAt.getTime())) {
      throw new BadRequestException('Ngày niêm yết không hợp lệ.');
    }
    if (listingAt.getTime() <= Date.now()) {
      throw new BadRequestException(
        'Ngày niêm yết phải trong tương lai.',
      );
    }

    const specs = [
      { label: 'Tổng cung', value: `${this.formatSupply(request.totalSupply)} ${request.symbol}` },
      {
        label: 'Giá mở cửa',
        value:
          request.initialPrice != null
            ? `${request.initialPrice} KC`
            : 'TBA',
      },
      { label: 'Creator', value: 'KingCoin Studio' },
      { label: 'Cặp', value: `${request.symbol}/KC` },
    ];

    const upcoming = await this.upcomingRepo.create({
      name: request.name,
      symbol: request.symbol,
      logo: request.logo,
      tagline: request.description?.slice(0, 80) ?? null,
      description: request.description,
      status: 'scheduled',
      listingAt,
      initialPrice: request.initialPrice,
      totalSupply: request.totalSupply,
      category: 'Creator',
      features: ['Spot'],
      specs,
      sortOrder: 0,
      isFeatured: dto.isFeatured ?? false,
      ownerId: request.userId,
      listingRequestId: request.id,
    });

    const updated = await this.repo.update(id, {
      status: 'approved',
      reviewedById: adminId,
      reviewedAt: new Date(),
      upcomingListingId: upcoming.id,
    });

    const dateStr = listingAt.toLocaleString('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.notifications.notify({
      userId: request.userId,
      type: NotificationType.LISTING_REQUEST_APPROVED,
      priority: NotificationPriority.high,
      title: 'Yêu cầu niêm yết đã duyệt',
      body: `${request.symbol} sẽ lên sàn ${dateStr}. Countdown đã bật trên Markets.`,
      dedupeKey: `LISTING_REQUEST_APPROVED:${request.id}`,
      payload: {
        deeplink: '/token/list',
        requestId: request.id,
        symbol: request.symbol,
        listingAt: listingAt.toISOString(),
      },
    });

    return updated;
  }

  async reject(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<ListingRequest> {
    const request = await this.repo.findById(id);
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu.');
    if (request.status !== 'pending') {
      throw new BadRequestException('Yêu cầu không ở trạng thái chờ duyệt.');
    }

    const fee = request.listingFeeKc;
    if (fee > 0) {
      const quoteId = await this.userRepo.getQuoteTokenId();
      if (quoteId) {
        await this.userRepo.adjustBalanceTokenByUserId(
          request.userId,
          quoteId,
          fee,
        );
      } else {
        await this.userRepo.adjustStableCoinByUserId(request.userId, fee);
      }
      await this.ledgerService.append({
        userId: request.userId,
        amount: fee,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType: 'listing_fee_refund',
        refId: request.id,
        note: `Hoàn phí niêm yết ${request.symbol}`,
      });
    }

    const updated = await this.repo.update(id, {
      status: 'rejected',
      reviewedById: adminId,
      reviewedAt: new Date(),
      rejectionReason: reason?.trim() || 'Không đạt yêu cầu niêm yết.',
    });

    await this.notifications.notify({
      userId: request.userId,
      type: NotificationType.LISTING_REQUEST_REJECTED,
      priority: NotificationPriority.high,
      title: 'Yêu cầu niêm yết bị từ chối',
      body:
        reason?.trim() ||
        `${request.symbol} chưa được duyệt. Phí đã hoàn (nếu có).`,
      dedupeKey: `LISTING_REQUEST_REJECTED:${request.id}`,
      payload: {
        deeplink: '/issuer/tokens',
        requestId: request.id,
        symbol: request.symbol,
      },
    });

    return updated;
  }

  /** Cron: mint token khi đến listingAt */
  async processDueGoLive(): Promise<number> {
    const due = await this.upcomingRepo.findDueForGoLive();
    let count = 0;
    for (const row of due) {
      if (!row.listingRequestId) continue;
      try {
        await this.goLive(row.listingRequestId, row.id);
        count += 1;
      } catch (err) {
        console.error('goLive failed', row.id, err);
      }
    }
    return count;
  }

  private async goLive(requestId: string, upcomingId: string): Promise<void> {
    const request = await this.repo.findById(requestId);
    if (!request || request.status === 'live') {
      await this.upcomingRepo.deleteById(upcomingId).catch(() => undefined);
      return;
    }

    const token = await this.tokenService.create(
      {
        name: request.name,
        symbol: request.symbol,
        logo: request.logo,
        decimals: request.decimals,
        totalSupply: request.totalSupply,
        circulatingSupply: request.totalSupply,
        initialPrice: request.initialPrice ?? undefined,
        description: request.description ?? undefined,
        communityLinks: request.communityLinks ?? undefined,
        owner: { connect: { id: request.userId } },
      },
      { skipListingFee: true },
    );

    await this.repo.update(requestId, {
      status: 'live',
      tokenId: token.id,
    });
    await this.upcomingRepo.deleteById(upcomingId);
  }

  private formatSupply(n: number): string {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }
}
