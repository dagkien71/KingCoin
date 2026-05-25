import { isLiquidityBotEmail } from '@common/system-accounts.util';
import { normalizeWalletCode } from '@common/wallet-code.util';
import { LedgerService } from '@modules/ledger/ledger.service';
import { NotificationService } from '@modules/notification/notification.service';
import { walletPoolLabel } from '@modules/wallet/wallet-pool.util';
import { UserRepository } from '@modules/user/user.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationPriority,
  NotificationType,
  WalletPool,
  WalletTransfer,
} from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import {
  InternalWalletTransferDto,
  TransferToUserDto,
} from './dto/wallet-transfer.dto';

export type WalletOverview = {
  walletCode: string;
  spotKc: number;
  futuresKc: number;
  fundingKc: number;
};

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationService,
  ) {}

  async getOverview(userId: string): Promise<WalletOverview> {
    const walletCode = await this.userRepository.ensureWalletCode(userId);
    const [spotKc, futuresKc, fundingKc] = await Promise.all([
      this.userRepository.getWalletKc(userId, WalletPool.spot),
      this.userRepository.getWalletKc(userId, WalletPool.futures),
      this.userRepository.getWalletKc(userId, WalletPool.funding),
    ]);
    return { walletCode, spotKc, futuresKc, fundingKc };
  }

  async lookupWalletCode(
    code: string,
  ): Promise<{ walletCode: string; username: string | null } | null> {
    const normalized = normalizeWalletCode(code);
    const user = await this.userRepository.findByWalletCode(normalized);
    if (!user) return null;
    return {
      walletCode: user.walletCode ?? normalized,
      username: user.username,
    };
  }

  async transferToUser(
    fromUserId: string,
    dto: TransferToUserDto,
  ): Promise<WalletTransfer> {
    const toWallet = dto.toWallet ?? dto.fromWallet;
    const fromCode = await this.userRepository.ensureWalletCode(fromUserId);
    const toCodeNorm = normalizeWalletCode(dto.toWalletCode);
    const recipient = await this.userRepository.findByWalletCode(toCodeNorm);
    if (!recipient) {
      throw new NotFoundException('Không tìm thấy mã ví nhận.');
    }
    if (recipient.id === fromUserId) {
      throw new BadRequestException(
        'Không thể chuyển cho chính mã ví của bạn — dùng chuyển nội bộ giữa các ví.',
      );
    }

    const sender = await this.userRepository.findById(fromUserId);
    if (
      isLiquidityBotEmail(sender?.email, sender?.username) ||
      isLiquidityBotEmail(recipient.email, recipient.username)
    ) {
      throw new BadRequestException('Tài khoản hệ thống không dùng chuyển ví.');
    }

    const amount = Number(dto.amount);
    await this.userRepository.adjustWalletKc(fromUserId, dto.fromWallet, -amount);
    await this.userRepository.adjustWalletKc(recipient.id, toWallet, amount);

    const quoteId = await this.userRepository.getQuoteTokenId();
    const transfer = await this.prisma.walletTransfer.create({
      data: {
        fromUserId,
        toUserId: recipient.id,
        amount,
        fromWallet: dto.fromWallet,
        toWallet,
        fromCode,
        toCode: recipient.walletCode ?? toCodeNorm,
        note: dto.note?.trim() || null,
      },
    });

    await this.appendLedgerPair({
      fromUserId,
      toUserId: recipient.id,
      amount,
      fromWallet: dto.fromWallet,
      toWallet,
      transferId: transfer.id,
      note: dto.note,
    });

    const fromLabel = walletPoolLabel(dto.fromWallet);
    const toLabel = walletPoolLabel(toWallet);
    await this.notifications.notify({
      userId: recipient.id,
      type: NotificationType.WALLET_TRANSFER_RECEIVED,
      priority: NotificationPriority.high,
      title: 'Nhận KC từ chuyển ví',
      body: `+${amount.toLocaleString('vi-VN')} KC (${toLabel}) từ ${fromCode}`,
      dedupeKey: `WALLET_IN:${transfer.id}`,
      payload: {
        deeplink: '/account/transfer',
        transferId: transfer.id,
        amount,
        fromWallet: dto.fromWallet,
        toWallet,
      },
    });

    return transfer;
  }

  async transferInternal(
    userId: string,
    dto: InternalWalletTransferDto,
  ): Promise<WalletTransfer> {
    if (dto.fromWallet === dto.toWallet) {
      throw new BadRequestException('Ví nguồn và ví đích phải khác nhau.');
    }
    const amount = Number(dto.amount);
    const code = await this.userRepository.ensureWalletCode(userId);

    await this.userRepository.adjustWalletKc(userId, dto.fromWallet, -amount);
    await this.userRepository.adjustWalletKc(userId, dto.toWallet, amount);

    const transfer = await this.prisma.walletTransfer.create({
      data: {
        fromUserId: userId,
        toUserId: userId,
        amount,
        fromWallet: dto.fromWallet,
        toWallet: dto.toWallet,
        fromCode: code,
        toCode: code,
        note: 'Chuyển nội bộ',
      },
    });

    await this.appendLedgerPair({
      fromUserId: userId,
      toUserId: userId,
      amount,
      fromWallet: dto.fromWallet,
      toWallet: dto.toWallet,
      transferId: transfer.id,
      note: 'Nội bộ',
    });

    return transfer;
  }

  listTransfers(
    userId: string,
    limit = 30,
  ): Promise<WalletTransfer[]> {
    return this.prisma.walletTransfer.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
  }

  private async appendLedgerPair(opts: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    fromWallet: WalletPool;
    toWallet: WalletPool;
    transferId: string;
    note?: string;
  }): Promise<void> {
    const quoteId = await this.userRepository.getQuoteTokenId();
    const fromLabel = walletPoolLabel(opts.fromWallet);
    const toLabel = walletPoolLabel(opts.toWallet);
    const extra = opts.note?.trim() ? ` — ${opts.note.trim()}` : '';

    await this.ledger.append({
      userId: opts.fromUserId,
      amount: -opts.amount,
      currency: 'KC',
      tokenId: quoteId ?? undefined,
      refType: 'wallet_transfer_out',
      refId: opts.transferId,
      note: `Chuyển ra ${toLabel} (${fromLabel})${extra}`,
    });

    if (opts.fromUserId !== opts.toUserId) {
      await this.ledger.append({
        userId: opts.toUserId,
        amount: opts.amount,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType: 'wallet_transfer_in',
        refId: opts.transferId,
        note: `Nhận vào ${toLabel}${extra}`,
      });
    } else {
      await this.ledger.append({
        userId: opts.toUserId,
        amount: opts.amount,
        currency: 'KC',
        tokenId: quoteId ?? undefined,
        refType: 'wallet_transfer_in',
        refId: opts.transferId,
        note: `Chuyển nội bộ → ${toLabel}${extra}`,
      });
    }
  }
}
