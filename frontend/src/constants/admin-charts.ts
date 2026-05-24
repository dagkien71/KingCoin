/** Chiều cao vùng vẽ nến (px) — đồng nhất mọi ô lưới */
export const ADMIN_CHART_PLOT_HEIGHT_PX = 260;

/** @deprecated dùng ADMIN_CHART_PLOT_HEIGHT_PX */
export const ADMIN_CHART_CELL_HEIGHT_PX = ADMIN_CHART_PLOT_HEIGHT_PX;

/** Header ô chart (px) — cố định để hàng grid cao bằng nhau */
export const ADMIN_CHART_HEADER_MIN_HEIGHT_PX = 52;

/** Tổng chiều cao một ô (header + plot) */
export const ADMIN_CHART_CARD_HEIGHT_PX =
  ADMIN_CHART_HEADER_MIN_HEIGHT_PX + ADMIN_CHART_PLOT_HEIGHT_PX;
