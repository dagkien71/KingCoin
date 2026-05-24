export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

/** Origin API (không có /api/v1) — dùng cho Socket.IO namespace /realtime */
export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ||
  API_URL.replace(/\/api\/v\d+\/?$/, "");

export const WS_NAMESPACE = "/realtime";

/** Poll dự phòng khi WebSocket mất kết nối */
export const LIVE_FALLBACK_MS = Number(
  process.env.NEXT_PUBLIC_LIVE_FALLBACK_MS ?? "4000"
);
