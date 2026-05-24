export type PathWindowInput = {
  startAt?: string;
  endAt?: string;
  /** Phút — ưu tiên khi preset «chạy ngay» */
  durationMin?: number;
  minutes?: number;
};

/**
 * Chuẩn hóa [startAt, endAt] theo đồng hồ server.
 * - Preset gửi ISO từ trình duyệt: nếu endAt đã qua (lệch giờ) → neo lại now → now+duration.
 * - Chỉ gửi durationMin/minutes: now → now+duration.
 * - Lịch tương lai (startAt > now): giữ nguyên A→B.
 */
export function resolvePathTimeWindow(
  input: PathWindowInput,
  now = Date.now(),
): { startAt: number; endAt: number } {
  const durationMs =
    (input.durationMin ?? input.minutes ?? 10) * 60_000;

  let startAt = input.startAt ? Date.parse(input.startAt) : now;
  let endAt = input.endAt ? Date.parse(input.endAt) : NaN;

  if (!Number.isFinite(startAt)) {
    startAt = now;
  }

  if (!Number.isFinite(endAt)) {
    endAt = startAt + durationMs;
  }

  const span = endAt - startAt;
  const intendedSpan =
    span >= 30_000 ? span : durationMs;

  // Lịch đặt tương lai — không kéo về now
  if (startAt > now + 2000) {
    return { startAt, endAt };
  }

  // Cửa sổ đã hết trên server (client chậm / ISO cũ)
  if (endAt <= now) {
    return { startAt: now, endAt: now + intendedSpan };
  }

  // Bắt đầu ngay: neo start = now, giữ nguyên thời lượng còn lại hoặc full span
  if (startAt < now) {
    const remaining = endAt - now;
    const useSpan =
      remaining >= 30_000 ? remaining : intendedSpan;
    return { startAt: now, endAt: now + useSpan };
  }

  return { startAt, endAt };
}
