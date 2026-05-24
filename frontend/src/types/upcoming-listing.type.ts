export type UpcomingListingStatus = "review" | "scheduled" | "announced";

export type UpcomingListingSpec = {
  label: string;
  value: string;
};

export interface IUpcomingListing {
  id: string;
  name: string;
  symbol: string;
  logo?: string | null;
  tagline?: string | null;
  description?: string | null;
  status: UpcomingListingStatus | string;
  listingAt: string;
  initialPrice?: number | null;
  totalSupply?: number | null;
  category?: string | null;
  features: string[];
  specs?: UpcomingListingSpec[] | null;
  sortOrder: number;
  isFeatured: boolean;
}

export interface IUpcomingListingDetail {
  listing: IUpcomingListing;
  preorderCount: number;
  totalPreorderKc: number;
  myPreorder: { amountKc: number } | null;
}

export type CountdownParts = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  isLive: boolean;
};

export function parseCountdown(targetIso: string, now = Date.now()): CountdownParts {
  const target = new Date(targetIso).getTime();
  const diff = target - now;
  if (!Number.isFinite(target)) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isLive: false };
  }
  if (diff <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isLive: true };
  }
  const totalMs = diff;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { totalMs, days, hours, minutes, seconds, isPast: false, isLive: false };
}

export function formatListingDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
