export type PriceScheduleStatus =
  | 'scheduled'
  | 'active'
  | 'ended'
  | 'cancelled';

export type PriceSchedule = {
  id: string;
  tokenId: string;
  startAt: number;
  endAt: number;
  priceMin: number;
  priceMax: number;
  waveCycles: number;
  restoreOnEnd: boolean;
  status: PriceScheduleStatus;
  createdAt: number;
  /** Giá spot lúc bắt đầu lịch (để khôi phục) */
  priceAtStart?: number;
  /** Giá mục tiêu hiện tại (tick gần nhất) */
  currentTarget?: number;
};

/** Giá mục tiêu tại thời điểm `now` — dao động sin trong [priceMin, priceMax]. */
export function scheduledPriceAt(
  schedule: PriceSchedule,
  now: number,
): number | null {
  if (schedule.status === 'cancelled' || schedule.status === 'ended') {
    return null;
  }
  if (now < schedule.startAt) return null;
  if (now >= schedule.endAt) return null;

  const span = schedule.endAt - schedule.startAt;
  if (span <= 0) return null;

  const progress = (now - schedule.startAt) / span;
  const center = (schedule.priceMin + schedule.priceMax) / 2;
  const amp = (schedule.priceMax - schedule.priceMin) / 2;
  const cycles = schedule.waveCycles ?? 4;
  const wave = Math.sin(progress * Math.PI * 2 * cycles);
  return Number((center + amp * wave).toFixed(8));
}

export function scheduleProgress(
  schedule: PriceSchedule,
  now: number,
): number {
  if (now <= schedule.startAt) return 0;
  if (now >= schedule.endAt) return 1;
  return (now - schedule.startAt) / (schedule.endAt - schedule.startAt);
}
