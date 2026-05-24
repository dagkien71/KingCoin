import {
  NotificationPriority,
  NotificationType,
} from '@prisma/client';

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  dedupeKey?: string;
};

export type NotificationPayload = {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
};

export const MAX_NOTIFICATIONS_PER_USER = 500;
export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export {
  tradeDeeplink,
  futuresDeeplink,
} from '../../common/token-route.util';
