/** Chiều cao khối biểu đồ cố định (preview / token detail). */
export const TRADE_CHART_HEIGHT_PX = 440;

/** Toolbar + legend (ước lượng khi chưa đo DOM). */
export const CHART_CHROME_HEIGHT_PX = 72;

/** Số nến hiển thị mặc định (trade — recent-bars). */
export const CHART_INITIAL_VISIBLE_BARS = 64;

/** Số điểm log tối đa khi fetch REST (tránh payload ~MB). */
export const CHART_LOG_FETCH_LIMIT = 400;

/** Token detail — ít nến hơn để nến đọc rõ (~ảnh mẫu 20–28 nến). */
export const CHART_DETAIL_INITIAL_VISIBLE_BARS = 28;

/** Khoảng trống trục giá khi autoScale (trên/dưới vùng nến). */
export const CHART_PRICE_SCALE_MARGINS = { top: 0.14, bottom: 0.12 } as const;

/** Dưới ngưỡng này: fit ngang (tránh 2–3 nến + rightOffset 8 → trống phải). */
export const CHART_MIN_BARS_FOR_RECENT_WINDOW = 16;

/** Chiều rộng ước lượng trục giá + lề khi tính barSpacing. */
export const CHART_PLOT_SIDE_RESERVE_PX = 88;

/** Khoảng cách nến mặc định (px) — vừa phải khi mở trang. */
export const CHART_DEFAULT_BAR_SPACING = 10;
/** Zoom ra tối đa (nến nhỏ / nhiều nến trên màn). */
export const CHART_MIN_BAR_SPACING = 0.5;
/** Zoom vào tối đa (nến rất to — wheel hoặc nút +). */
export const CHART_MAX_BAR_SPACING = 96;
/** Hệ số mỗi lần bấm nút zoom. */
export const CHART_ZOOM_BUTTON_FACTOR = 1.28;

