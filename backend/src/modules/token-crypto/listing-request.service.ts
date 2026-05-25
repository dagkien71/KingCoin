import {
  deriveListingInitialPrice,
  isTokenAssetCategory,
  TOKEN_ASSET_CATEGORY_LABELS,
  validateListingAllocation,
} from '@common/token-listing.constants';
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
  category: string;
  liquidityKcAmount: number;
  liquidityTokenAmount: number;
  teamTokenAmount: number;
  description?: string;
  communityLinks?: Prisma.InputJsonValue;
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

    const category = payload.category.trim().toLowerCase();
    if (!isTokenAssetCategory(category)) {
      throw new BadRequestException('Hạng mục (category) không hợp lệ.');
    }

    const alloc = validateListingAllocation({
      totalSupply: payload.totalSupply,
      teamTokenAmount: payload.teamTokenAmount,
      liquidityTokenAmount: payload.liquidityTokenAmount,
    });
    if (!alloc.ok) {
      throw new BadRequestException(alloc.message ?? 'Phân bổ token không hợp lệ.');
    }

    const initialPrice = deriveListingInitialPrice(
      payload.liquidityKcAmount,
      payload.liquidityTokenAmount,
    );
    assertPositiveSpotPrice(initialPrice, 'Giá khởi điểm (từ pool)');

    const listingFee = this.listingFee();
    const liquidityKc = Number(payload.liquidityKcAmount);
    const kcRequired = listingFee + liquidityKc;
    const kc = await this.userRepo.getQuoteBalance(userId);
    if (kc < kcRequired - 1e-9) {
      throw new BadRequestException(
        `Không đủ KC. Cần ${kcRequired.toFixed(2)} KC (phí ${listingFee} + thanh khoản ${liquidityKc.toFixed(2)}), hiện có ${kc.toFixed(4)} KC.`,
      );
    }

    const request = await this.repo.create({
      userId,
      name: payload.name.trim(),
      symbol,
      logo: payload.logo ?? null,
      decimals: payload.decimals ?? 6,
      totalSupply: payload.totalSupply,
      initialPrice,
      category,
      liquidityKcAmount: liquidityKc,
      liquidityTokenAmount: payload.liquidityTokenAmount,
      teamTokenAmount: payload.teamTokenAmount,
      description: payload.description ?? null,
      communityLinks: payload.communityLinks ?? undefined,
      status: 'pending',
      listingFeeKc: listingFee,
    });

    const quoteId = await this.userRepo.getQuoteTokenId();
    const deductKc = async (amount: number, note: string, refType: string) => {
      if (amount <= 0) return;
      if (quoteId) {
        await this.userRepo.adjustBalanceTokenByUserId(userId, quoteId, -amount);
      } else {
        await this.userRepo.adjustStableCoinByUserId(userId, -amount);
      }
      await this.ledgerService.append({
        userId,
        amount: -amount,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType,
        refId: request.id,
        note,
      });
    };

    await deductKc(
      listingFee,
      `Phí yêu cầu niêm yết ${symbol}`,
      'listing_fee',
    );
    await deductKc(
      liquidityKc,
      `KC thanh khoản niêm yết ${symbol}`,
      'listing_liquidity_kc',
    );

    if (listingFee > 0) {
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

    const catLabel =
      TOKEN_ASSET_CATEGORY_LABELS[
        request.category as keyof typeof TOKEN_ASSET_CATEGORY_LABELS
      ] ?? request.category;
    const treasury = Math.max(
      0,
      request.totalSupply -
        request.teamTokenAmount -
        request.liquidityTokenAmount,
    );
    const specs = [
      { label: 'Hạng mục', value: catLabel },
      { label: 'Tổng cung', value: `${this.formatSupply(request.totalSupply)} ${request.symbol}` },
      {
        label: 'Thanh khoản',
        value: `${this.formatSupply(request.liquidityTokenAmount)} ${request.symbol} + ${request.liquidityKcAmount.toLocaleString('vi-VN')} KC`,
      },
      {
        label: 'Team giữ',
        value: `${this.formatSupply(request.teamTokenAmount)} ${request.symbol}`,
      },
      ...(treasury > 0
        ? [
            {
              label: 'Kho bạc / chưa lưu hành',
              value: `${this.formatSupply(treasury)} ${request.symbol}`,
            },
          ]
        : []),
      {
        label: 'Giá mở cửa',
        value:
          request.initialPrice != null
            ? `${request.initialPrice} KC / token`
            : 'TBA',
      },
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
      category: catLabel,
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

    const refundTotal =
      request.listingFeeKc + (request.liquidityKcAmount ?? 0);
    if (refundTotal > 0) {
      const quoteId = await this.userRepo.getQuoteTokenId();
      if (quoteId) {
        await this.userRepo.adjustBalanceTokenByUserId(
          request.userId,
          quoteId,
          refundTotal,
        );
      } else {
        await this.userRepo.adjustStableCoinByUserId(
          request.userId,
          refundTotal,
        );
      }
      await this.ledgerService.append({
        userId: request.userId,
        amount: refundTotal,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType: 'listing_fee_refund',
        refId: request.id,
        note: `Hoàn phí + KC thanh khoản niêm yết ${request.symbol}`,
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

    const circulating = request.liquidityTokenAmount;
    const token = await this.tokenService.create(
      {
        name: request.name,
        symbol: request.symbol,
        logo: request.logo,
        decimals: request.decimals,
        totalSupply: request.totalSupply,
        circulatingSupply: circulating,
        initialPrice: request.initialPrice ?? undefined,
        description: request.description ?? undefined,
        communityLinks: request.communityLinks ?? undefined,
        category: request.category,
        owner: { connect: { id: request.userId } },
      },
      {
        skipListingFee: true,
        skipDefaultBotInventory: true,
        listingLiquidity: {
          tokenAmount: request.liquidityTokenAmount,
          kcAmount: request.liquidityKcAmount,
        },
        teamAllocation: {
          userId: request.userId,
          amount: request.teamTokenAmount,
        },
      },
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
