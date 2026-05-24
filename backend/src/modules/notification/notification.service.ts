import { RealtimeService } from '@modules/realtime/realtime.service';
import {
  NotificationPriority,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import { WebPushService } from './web-push.service';
import {
  DEDUPE_WINDOW_MS,
  MAX_NOTIFICATIONS_PER_USER,
  NotificationPayload,
  NotifyInput,
} from './notification.types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly marginWarned = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly webPush: WebPushService,
  ) {}

  async notify(input: NotifyInput): Promise<NotificationPayload | null> {
    const { userId, type, title, body, dedupeKey } = input;
    const priority = input.priority ?? NotificationPriority.normal;

    if (dedupeKey) {
      const since = new Date(Date.now() - DEDUPE_WINDOW_MS);
      const dup = await this.prisma.notification.findFirst({
        where: { userId, dedupeKey, createdAt: { gte: since } },
      });
      if (dup) return null;
    }

    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (pref?.disabledTypes?.includes(type)) {
      return null;
    }

    const row = await this.prisma.notification.create({
      data: {
        userId,
        type,
        priority,
        title,
        body,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
        dedupeKey: dedupeKey ?? null,
      },
    });

    void this.trimOldNotifications(userId).catch((e) =>
      this.logger.warn('trim notifications', e),
    );

    const view = this.toPayload(row);
    this.realtime.emitUserNotification(userId, view);
    void this.webPush.sendToUser(userId, {
      title,
      body,
      deeplink:
        typeof input.payload?.deeplink === 'string'
          ? input.payload.deeplink
          : '/notifications',
      notificationId: row.id,
    });

    return view;
  }

  /** Gửi thông báo tới mọi tài khoản admin */
  async notifyAdmins(
    input: Omit<NotifyInput, 'userId'>,
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notify({ ...input, userId: admin.id }),
      ),
    );
  }

  shouldEmitMarginWarning(positionId: string, cooldownMs = 300_000): boolean {
    const last = this.marginWarned.get(positionId) ?? 0;
    if (Date.now() - last < cooldownMs) return false;
    this.marginWarned.set(positionId, Date.now());
    return true;
  }

  clearMarginWarning(positionId: string): void {
    this.marginWarned.delete(positionId);
  }

  async list(
    userId: string,
    opts: { limit?: number; unreadOnly?: boolean; cursor?: string },
  ): Promise<{ items: NotificationPayload[]; nextCursor: string | null }> {
    const limit = Math.min(opts.limit ?? 30, 100);
    const where: Prisma.NotificationWhereInput = { userId };
    if (opts.unreadOnly) where.readAt = null;
    if (opts.cursor) {
      where.id = { lt: opts.cursor };
    }

    const rows = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    let nextCursor: string | null = null;
    const slice = rows.length > limit ? rows.slice(0, limit) : rows;
    if (rows.length > limit) {
      nextCursor = slice[slice.length - 1]?.id ?? null;
    }

    return {
      items: slice.map((r) => this.toPayload(r)),
      nextCursor,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, id: string): Promise<NotificationPayload> {
    const row = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException('Không tìm thấy thông báo.');
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return this.toPayload(updated);
  }

  async markAllRead(userId: string): Promise<number> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  }

  async getPreferences(userId: string) {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return {
      webPushEnabled: row.webPushEnabled,
      disabledTypes: row.disabledTypes,
      vapidPublicKey: this.webPush.getPublicKey(),
    };
  }

  async updatePreferences(
    userId: string,
    data: { webPushEnabled?: boolean; disabledTypes?: string[] },
  ) {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        webPushEnabled: data.webPushEnabled ?? true,
        disabledTypes: data.disabledTypes ?? [],
      },
      update: {
        ...(data.webPushEnabled !== undefined
          ? { webPushEnabled: data.webPushEnabled }
          : {}),
        ...(data.disabledTypes !== undefined
          ? { disabledTypes: data.disabledTypes }
          : {}),
      },
    });
    return {
      webPushEnabled: row.webPushEnabled,
      disabledTypes: row.disabledTypes,
      vapidPublicKey: this.webPush.getPublicKey(),
    };
  }

  async savePushSubscription(
    userId: string,
    sub: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent,
      },
      update: {
        userId,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        userAgent,
      },
    });
  }

  async removePushSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  private async trimOldNotifications(userId: string): Promise<void> {
    const count = await this.prisma.notification.count({ where: { userId } });
    if (count <= MAX_NOTIFICATIONS_PER_USER) return;
    const excess = count - MAX_NOTIFICATIONS_PER_USER;
    const oldest = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: excess,
      select: { id: true },
    });
    if (!oldest.length) return;
    await this.prisma.notification.deleteMany({
      where: { id: { in: oldest.map((o) => o.id) } },
    });
  }

  private toPayload(row: {
    id: string;
    userId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    body: string;
    payload: unknown;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationPayload {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      priority: row.priority,
      title: row.title,
      body: row.body,
      payload:
        row.payload && typeof row.payload === 'object'
          ? (row.payload as Record<string, unknown>)
          : null,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }
}
