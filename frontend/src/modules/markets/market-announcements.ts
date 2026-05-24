export type MarketAnnouncement = {
  id: string;
  tag: "hot" | "new" | "info" | "futures" | "quest";
  text: string;
  href?: string;
};

export const MARKET_ANNOUNCEMENTS: MarketAnnouncement[] = [
  {
    id: "a1",
    tag: "hot",
    text: "KingCoin Market — dữ liệu giá cập nhật live qua WebSocket",
    href: "/token/list",
  },
  {
    id: "a2",
    tag: "futures",
    text: "Giao dịch Futures đã mở cho các cặp alt — đòn bẩy tới 50x (mô phỏng)",
    href: "/futures",
  },
  {
    id: "a3",
    tag: "quest",
    text: "Hoàn thành quest onboarding để nhận KC miễn phí",
    href: "/quest",
  },
  {
    id: "a4",
    tag: "new",
    text: "Creator có thể phát hành token qua KingCoin Studio",
    href: "/issuer",
  },
  {
    id: "a5",
    tag: "info",
    text: "KC là stablecoin nội bộ — mọi cặp giao dịch quy chiếu KC",
  },
];
