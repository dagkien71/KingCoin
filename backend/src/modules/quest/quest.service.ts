import { NotificationService } from '@modules/notification/notification.service';
import { LedgerService } from '@modules/ledger/ledger.service';
import { ReferralService } from '@modules/referral/referral.service';
import { UserRepository } from '@modules/user/user.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationPriority,
  NotificationType,
  QuestCompletion,
  QuestDefinition,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@providers/prisma';
import { buildMarketingQuestCatalog } from './quest-catalog';

export type QuestListItem = QuestDefinition & {
  completed: boolean;
  lastCompletedAt: Date | null;
  eligible: boolean;
  eligibleReason: string | null;
  progress: { current: number; target: number } | null;
  cooldownEndsAt: Date | null;
  engageStartedAt: Date | null;
  canClaimAt: Date | null;
};

@Injectable()
export class QuestService {
  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
    private ledgerService: LedgerService,
    private referralService: ReferralService,
    private notifications: NotificationService,
  ) {}

  private delayedClaimMs(): number {
    return (
      (Number(process.env.QUEST_DELAYED_CLAIM_SECONDS ?? '45') || 45) * 1000
    );
  }

  async ensureDefaultQuests(): Promise<void> {
    for (const q of buildMarketingQuestCatalog()) {
      const data = {
        title: q.title,
        description: q.description,
        rewardKc: q.rewardKc,
        type: q.type,
        category: q.category,
        sortOrder: q.sortOrder,
        ctaLabel: q.ctaLabel,
        externalUrl: q.externalUrl,
        icon: q.icon,
        verifyMode: q.verifyMode,
        meta: q.meta,
        active: q.active,
        cooldownHours: q.cooldownHours,
        maxClaimsPerUser: q.maxClaimsPerUser,
      };
      const existing = await this.prisma.questDefinition.findUnique({
        where: { slug: q.slug },
      });
      if (existing) {
        await this.prisma.questDefinition.update({
          where: { slug: q.slug },
          data,
        });
      } else {
        await this.prisma.questDefinition.create({
          data: { slug: q.slug, ...data },
        });
      }
    }
  }

  async listForUser(userId: string): Promise<QuestListItem[]> {
    await this.ensureDefaultQuests();
    const quests = await this.prisma.questDefinition.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const completions = await this.prisma.questCompletion.findMany({
      where: { userId },
    });
    const engagements = await this.prisma.questEngagement.findMany({
      where: { userId },
    });
    const byQuest = new Map(completions.map((c) => [c.questId, c]));
    const byEngage = new Map(engagements.map((e) => [e.questId, e]));

    const items: QuestListItem[] = [];
    for (const q of quests) {
      const c = byQuest.get(q.id);
      const engage = byEngage.get(q.id);
      const onCooldown = this.isOnCooldown(q, c);
      const completedOneShot =
        q.maxClaimsPerUser <= 1 && Boolean(c) && !onCooldown;
      const { eligible, reason, progress } = await this.checkEligibility(
        userId,
        q,
        c,
        engage,
        onCooldown,
      );
      const canClaimAt = this.computeCanClaimAt(q, engage);
      items.push({
        ...q,
        completed: completedOneShot,
        lastCompletedAt: c?.completedAt ?? null,
        eligible,
        eligibleReason: reason,
        progress,
        cooldownEndsAt: this.cooldownEndsAt(q, c),
        engageStartedAt: engage?.startedAt ?? null,
        canClaimAt,
      });
    }
    return items;
  }

  private isOnCooldown(
    quest: QuestDefinition,
    completion: QuestCompletion | undefined,
  ): boolean {
    if (!quest.cooldownHours || !completion) return false;
    const ms = quest.cooldownHours * 3600 * 1000;
    return Date.now() - completion.completedAt.getTime() < ms;
  }

  private cooldownEndsAt(
    quest: QuestDefinition,
    completion: QuestCompletion | undefined,
  ): Date | null {
    if (!quest.cooldownHours || !completion) return null;
    const ms = quest.cooldownHours * 3600 * 1000;
    const end = completion.completedAt.getTime() + ms;
    if (Date.now() >= end) return null;
    return new Date(end);
  }

  private computeCanClaimAt(
    quest: QuestDefinition,
    engage: { startedAt: Date } | undefined,
  ): Date | null {
    if (
      quest.verifyMode !== 'delayed_honor' &&
      quest.verifyMode !== 'external_then_claim'
    ) {
      return null;
    }
    if (!engage) return null;
    return new Date(engage.startedAt.getTime() + this.delayedClaimMs());
  }

  private metaInt(quest: QuestDefinition, key: string, fallback: number): number {
    const m = quest.meta as Record<string, unknown> | null;
    const v = m?.[key];
    return typeof v === 'number' ? v : fallback;
  }

  private async checkEligibility(
    userId: string,
    quest: QuestDefinition,
    completion: QuestCompletion | undefined,
    engage: { startedAt: Date } | undefined,
    onCooldown: boolean,
  ): Promise<{
    eligible: boolean;
    reason: string | null;
    progress: { current: number; target: number } | null;
  }> {
    if (quest.maxClaimsPerUser <= 1 && completion && !onCooldown) {
      return {
        eligible: false,
        reason: 'Đã hoàn thành',
        progress: null,
      };
    }
    if (onCooldown && quest.cooldownHours) {
      return {
        eligible: false,
        reason: 'Đang trong thời gian chờ',
        progress: null,
      };
    }

    const slug = quest.slug;
    const progress = await this.questProgress(userId, quest);

    if (
      slug === 'referral-first-friend' ||
      slug === 'referral-3-friends'
    ) {
      const target = this.metaInt(
        quest,
        'minQualifiedReferrals',
        slug === 'referral-3-friends' ? 3 : 1,
      );
      const current = progress?.current ?? 0;
      if (current < target) {
        return {
          eligible: false,
          reason: `Cần ${target} bạn đã giao dịch (${current}/${target})`,
          progress: { current, target },
        };
      }
      return { eligible: true, reason: null, progress: { current, target } };
    }

    if (slug === 'referee-welcome') {
      const referred = await this.referralService.wasReferred(userId);
      if (!referred) {
        return {
          eligible: false,
          reason: 'Chỉ dành cho tài khoản đăng ký qua link mời',
          progress: null,
        };
      }
      return { eligible: true, reason: null, progress: null };
    }

    if (slug === 'share-referral-card') {
      await this.referralService.ensureCodeForUser(userId);
      return { eligible: true, reason: null, progress: null };
    }

    if (
      quest.verifyMode === 'delayed_honor' ||
      quest.verifyMode === 'external_then_claim'
    ) {
      if (!engage) {
        return {
          eligible: false,
          reason: 'Nhấn «Làm ngay» trước khi nhận thưởng',
          progress: null,
        };
      }
      const canAt = engage.startedAt.getTime() + this.delayedClaimMs();
      if (Date.now() < canAt) {
        const sec = Math.ceil((canAt - Date.now()) / 1000);
        return {
          eligible: false,
          reason: `Vui lòng đợi thêm ${sec} giây`,
          progress: null,
        };
      }
    }

    if (slug === 'share-my-token') {
      const owned = await this.prisma.tokenCrypto.findFirst({
        where: { ownerId: userId },
      });
      if (!owned) {
        return {
          eligible: false,
          reason: 'Hãy phát hành token trước',
          progress: null,
        };
      }
    }

    const autoOk = await this.validateAutoConditions(userId, quest);
    if (!autoOk.ok) {
      return {
        eligible: false,
        reason: autoOk.message,
        progress,
      };
    }

    return { eligible: true, reason: null, progress };
  }

  private async questProgress(
    userId: string,
    quest: QuestDefinition,
  ): Promise<{ current: number; target: number } | null> {
    if (
      quest.slug === 'referral-first-friend' ||
      quest.slug === 'referral-3-friends'
    ) {
      const target = this.metaInt(
        quest,
        'minQualifiedReferrals',
        quest.slug === 'referral-3-friends' ? 3 : 1,
      );
      const current =
        await this.referralService.countQualifiedReferrals(userId);
      return { current, target };
    }
    if (quest.slug === 'add-watchlist-3') {
      const user = await this.userRepository.findById(userId);
      const target = this.metaInt(quest, 'minWatchlist', 3);
      const current = user?.watchList?.length ?? 0;
      return { current, target };
    }
    return null;
  }

  private async validateAutoConditions(
    userId: string,
    quest: QuestDefinition,
  ): Promise<{ ok: boolean; message: string }> {
    switch (quest.slug) {
      case 'onboarding-profile': {
        const user = await this.userRepository.findById(userId);
        if (!user?.username && !user?.avatar) {
          return {
            ok: false,
            message: 'Hãy cập nhật username hoặc avatar trước.',
          };
        }
        return { ok: true, message: '' };
      }
      case 'first-trade': {
        const order = await this.prisma.order.findFirst({
          where: { userId },
        });
        if (!order) {
          return { ok: false, message: 'Hãy đặt ít nhất một lệnh trước.' };
        }
        return { ok: true, message: '' };
      }
      case 'add-watchlist-3': {
        const user = await this.userRepository.findById(userId);
        const min = this.metaInt(quest, 'minWatchlist', 3);
        if ((user?.watchList?.length ?? 0) < min) {
          return {
            ok: false,
            message: `Thêm ít nhất ${min} token vào watchlist.`,
          };
        }
        return { ok: true, message: '' };
      }
      case 'convert-first': {
        const entry = await this.prisma.ledgerEntry.findFirst({
          where: { userId, refType: 'convert' },
        });
        if (!entry) {
          return {
            ok: false,
            message: 'Hãy thực hiện chuyển đổi KC ↔ token trước.',
          };
        }
        return { ok: true, message: '' };
      }
      case 'weekly-active-trader': {
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const count = await this.prisma.order.count({
          where: { userId, createdAt: { gte: since } },
        });
        const min = this.metaInt(quest, 'minOrders7d', 3);
        if (count < min) {
          return {
            ok: false,
            message: `Cần ${min} lệnh trong 7 ngày (hiện ${count}).`,
          };
        }
        return { ok: true, message: '' };
      }
      case 'create-token': {
        const t = await this.prisma.tokenCrypto.findFirst({
          where: { ownerId: userId },
        });
        if (!t) {
          return { ok: false, message: 'Hãy phát hành token trước.' };
        }
        return { ok: true, message: '' };
      }
      case 'referral-first-friend':
      case 'referral-3-friends': {
        const target = this.metaInt(
          quest,
          'minQualifiedReferrals',
          quest.slug === 'referral-3-friends' ? 3 : 1,
        );
        const n = await this.referralService.countQualifiedReferrals(userId);
        if (n < target) {
          return {
            ok: false,
            message: `Cần ${target} bạn đã giao dịch (${n}/${target}).`,
          };
        }
        return { ok: true, message: '' };
      }
      case 'referee-welcome': {
        if (!(await this.referralService.wasReferred(userId))) {
          return {
            ok: false,
            message: 'Chỉ dành cho tài khoản đăng ký qua link mời.',
          };
        }
        return { ok: true, message: '' };
      }
      case 'share-referral-card':
        await this.referralService.ensureCodeForUser(userId);
        return { ok: true, message: '' };
      case 'daily-login':
        return { ok: true, message: '' };
      case 'share-trade-link':
      case 'share-token-page':
      case 'share-my-token':
      case 'social-follow-facebook':
      case 'social-follow-zalo':
        return { ok: true, message: '' };
      default:
        return { ok: true, message: '' };
    }
  }

  async engage(userId: string, questId: string): Promise<{ startedAt: Date }> {
    const quest = await this.prisma.questDefinition.findUnique({
      where: { id: questId },
    });
    if (!quest || !quest.active) {
      throw new NotFoundException('Nhiệm vụ không tồn tại.');
    }
    if (
      quest.verifyMode !== 'delayed_honor' &&
      quest.verifyMode !== 'external_then_claim'
    ) {
      throw new BadRequestException('Nhiệm vụ này không cần bước «Làm ngay».');
    }

    const row = await this.prisma.questEngagement.upsert({
      where: { userId_questId: { userId, questId } },
      create: { userId, questId },
      update: { startedAt: new Date() },
    });
    return { startedAt: row.startedAt };
  }

  async claim(userId: string, questId: string): Promise<QuestCompletion> {
    const quest = await this.prisma.questDefinition.findUnique({
      where: { id: questId },
    });
    if (!quest || !quest.active) {
      throw new NotFoundException('Nhiệm vụ không tồn tại.');
    }

    const existing = await this.prisma.questCompletion.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    if (quest.maxClaimsPerUser <= 1 && existing) {
      throw new BadRequestException('Bạn đã hoàn thành nhiệm vụ này.');
    }

    if (quest.cooldownHours && existing) {
      const ms = quest.cooldownHours * 3600 * 1000;
      const elapsed = Date.now() - existing.completedAt.getTime();
      if (elapsed < ms) {
        throw new BadRequestException(
          `Vui lòng thử lại sau ${Math.ceil((ms - elapsed) / 3600000)} giờ.`,
        );
      }
    }

    const engage = await this.prisma.questEngagement.findUnique({
      where: { userId_questId: { userId, questId } },
    });

    const { eligible, reason } = await this.checkEligibility(
      userId,
      quest,
      existing ?? undefined,
      engage ?? undefined,
      this.isOnCooldown(quest, existing ?? undefined),
    );
    if (!eligible) {
      throw new BadRequestException(reason ?? 'Chưa đủ điều kiện nhận thưởng.');
    }

    const autoOk = await this.validateAutoConditions(userId, quest);
    if (!autoOk.ok) {
      throw new BadRequestException(autoOk.message);
    }

    const quoteId = await this.userRepository.getQuoteTokenId();
    if (quoteId) {
      await this.userRepository.adjustBalanceTokenByUserId(
        userId,
        quoteId,
        quest.rewardKc,
      );
    } else {
      await this.userRepository.adjustStableCoinByUserId(
        userId,
        quest.rewardKc,
      );
    }

    await this.ledgerService.append({
      userId,
      amount: quest.rewardKc,
      currency: 'KC',
      tokenId: quoteId ?? undefined,
      refType: 'quest',
      refId: questId,
      note: quest.title,
    });

    let completion: QuestCompletion;
    if (existing && quest.maxClaimsPerUser > 1) {
      completion = await this.prisma.questCompletion.update({
        where: { id: existing.id },
        data: { completedAt: new Date(), status: 'completed' },
      });
    } else {
      completion = await this.prisma.questCompletion.create({
        data: { userId, questId, status: 'completed' },
      });
    }

    await this.notifications.notify({
      userId,
      type: NotificationType.QUEST_CLAIMED,
      priority: NotificationPriority.normal,
      title: 'Đã nhận thưởng',
      body: `+${quest.rewardKc} KC — ${quest.title}`,
      dedupeKey: `QUEST_CLAIMED:${completion.id}`,
      payload: {
        deeplink: '/quest',
        questId,
        rewardKc: quest.rewardKc,
      },
    });

    if (quest.slug.startsWith('referral')) {
      await this.notifications.notify({
        userId,
        type: NotificationType.REFERRAL_MILESTONE,
        priority: NotificationPriority.normal,
        title: 'Mốc giới thiệu',
        body: `Hoàn thành: ${quest.title}`,
        dedupeKey: `REFERRAL_MILESTONE:${userId}:${quest.slug}`,
        payload: { deeplink: '/quest', questSlug: quest.slug },
      });
    }

    return completion;
  }
}
