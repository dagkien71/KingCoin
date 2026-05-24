/** Khoảng cách tối thiểu giữa hai lần cập nhật số giá trên UI (ms) */
export const DISPLAY_TICKER_MS = Number(
  process.env.NEXT_PUBLIC_DISPLAY_TICKER_MS ?? "300"
);

/** Debounce NAV / portfolio khi giá live đổi (ms) */
export const NAV_PRICE_DEBOUNCE_MS = Number(
  process.env.NEXT_PUBLIC_NAV_PRICE_DEBOUNCE_MS ?? "450"
);

/** Thời gian highlight flash sau khi giá đổi (ms) */
export const PRICE_FLASH_MS = Number(
  process.env.NEXT_PUBLIC_PRICE_FLASH_MS ?? "550"
);
