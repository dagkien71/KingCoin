/** @deprecated V2 — dùng SMOOTH_TAU_* thay throttle flush */
export const DISPLAY_TICKER_MS = Number(
  process.env.NEXT_PUBLIC_DISPLAY_TICKER_MS ?? "300"
);

/** Hằng số lerp V2 — thời gian đạt ~63% target (ms) */
export const SMOOTH_TAU_UI_MS = Number(
  process.env.NEXT_PUBLIC_SMOOTH_TAU_UI_MS ?? "180"
);

export const SMOOTH_TAU_CHART_MS = Number(
  process.env.NEXT_PUBLIC_SMOOTH_TAU_CHART_MS ?? "420"
);

export const SMOOTH_TAU_NAV_MS = Number(
  process.env.NEXT_PUBLIC_SMOOTH_TAU_NAV_MS ?? "550"
);

/** @deprecated V2 dùng SMOOTH_TAU_NAV_MS */
export const NAV_PRICE_DEBOUNCE_MS = Number(
  process.env.NEXT_PUBLIC_NAV_PRICE_DEBOUNCE_MS ?? "550"
);

/** Thời gian highlight flash sau khi target giá đổi (ms) */
export const PRICE_FLASH_MS = Number(
  process.env.NEXT_PUBLIC_PRICE_FLASH_MS ?? "550"
);
