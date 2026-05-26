/** Lớp layout terminal Spot/Futures — mobile stack, tablet 2 cột, desktop 3 cột. */

export const TRADE_TERMINAL_GRID_CLASS =
  "flex flex-1 flex-col gap-3 p-3 " +
  "md:grid md:grid-cols-[minmax(0,1fr)_minmax(220px,272px)] md:grid-rows-[auto_auto_1fr] md:items-stretch md:gap-3 " +
  "xl:grid-cols-[minmax(0,1fr)_minmax(240px,280px)_minmax(260px,300px)] xl:grid-rows-none";

/** Chiều cao panel chart / sổ / đặt lệnh — co theo viewport trên tablet. */
export const TRADE_PANEL_HEIGHT_CLASS =
  "h-[min(400px,50vh)] max-h-[min(400px,50vh)] " +
  "md:h-[min(480px,54vh)] md:max-h-[min(480px,54vh)] md:min-h-[320px] " +
  "xl:h-[620px] xl:max-h-[620px]";

export const TRADE_CHART_SECTION_CLASS =
  "order-1 md:col-start-1 md:row-start-1 md:row-span-2 xl:row-span-1";

export const TRADE_BOOK_SECTION_CLASS =
  "order-3 md:order-2 md:col-start-2 md:row-start-1 xl:col-start-2 xl:row-start-1";

export const TRADE_ORDER_ASIDE_CLASS =
  "order-2 md:order-3 md:col-start-2 md:row-start-2 xl:order-3 xl:col-start-3 xl:row-start-1 xl:self-start";

export const TRADE_MY_ORDERS_SECTION_CLASS = "order-4 md:col-span-2 xl:col-span-3";
