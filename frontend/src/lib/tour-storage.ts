import { TourId } from "@/modules/onboarding/tour-types";

const STORAGE_KEY = "kc-completed-tours";
export const TOUR_SESSION_SKIP_KEY = "kc-tour-skipped-session";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeLocal(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function getLocalCompletedTours(): string[] {
  return readLocal();
}

export function isTourCompletedLocally(tourId: TourId): boolean {
  return readLocal().includes(tourId);
}

export function markTourCompletedLocally(tourId: TourId) {
  const set = new Set(readLocal());
  set.add(tourId);
  writeLocal([...set]);
}

export function mergeCompletedTours(
  local: string[],
  remote?: string[] | null
): string[] {
  return [...new Set([...(remote ?? []), ...local])];
}

export function isTourSkippedThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TOUR_SESSION_SKIP_KEY) === "1";
}

export function markTourSkippedThisSession() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOUR_SESSION_SKIP_KEY, "1");
}
