import { PriceAlertService } from '@modules/notification/price-alert.service';
import { NotificationService } from '@modules/notification/notification.service';
import {
  NotificationPriority,
  NotificationType,
} from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class NotificationJobsService {
  private readonly logger = new Logger(NotificationJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly priceAlerts: PriceAlertService,
    private readonly notifications: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async scanPriceAlerts(): Promise<void> {
    try {
      const n = await this.priceAlerts.scanAndTrigger();
      if (n > 0) this.logger.debug(`Price alerts triggered: ${n}`);
    } catch (e) {
      this.logger.error('Price alert scan failed', e);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scanQuestClaimable(): Promise<void> {
    try {
      const delayMs =
        (Number(process.env.QUEST_DELAYED_CLAIM_SECONDS ?? '45') || 45) *
        1000;
      const now = Date.now();

      const engagements = await this.prisma.questEngagement.findMany({
        take: 200,
        orderBy: { startedAt: 'desc' },
      });

      for (const eng of engagements) {
        const quest = await this.prisma.questDefinition.findUnique({
          where: { id: eng.questId },
        });
        if (!quest?.active) continue;
        if (
          quest.verifyMode !== 'delayed_honor' &&
          quest.verifyMode !== 'external_then_claim'
        ) {
          continue;
        }
        if (now < eng.startedAt.getTime() + delayMs) continue;

        const completion = await this.prisma.questCompletion.findUnique({
          where: {
            userId_questId: { userId: eng.userId, questId: eng.questId },
          },
        });
        if (completion && quest.maxClaimsPerUser <= 1) continue;

        await this.notifications.notify({
          userId: eng.userId,
          type: NotificationType.QUEST_CLAIMABLE,
          priority: NotificationPriority.normal,
          title: 'Nhiệm vụ sẵn sàng',
          body: `Bạn có thể nhận thưởng: ${quest.title}`,
          dedupeKey: `QUEST_CLAIMABLE:${eng.userId}:${eng.questId}`,
          payload: {
            deeplink: '/quest',
            questId: quest.id,
            questSlug: quest.slug,
          },
        });
      }
    } catch (e) {
      this.logger.error('Quest claimable scan failed', e);
    }
  }
}
