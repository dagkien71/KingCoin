import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@providers/prisma';
import * as webpush from 'web-push';

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private configured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject =
      process.env.VAPID_SUBJECT ?? 'mailto:support@kingcoin.local';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  }

  async sendToUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      deeplink?: string;
      notificationId?: string;
    },
  ): Promise<void> {
    if (!this.configured) return;

    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (pref && !pref.webPushEnabled) return;

    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (!subs.length) return;

    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      deeplink: payload.deeplink ?? '/notifications',
      notificationId: payload.notificationId,
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data,
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await this.prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
        } else {
          this.logger.warn(`Web push failed for ${sub.id}: ${String(err)}`);
        }
      }
    }
  }
}
