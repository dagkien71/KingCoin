import { defaultTradeHref } from "@/lib/token-routes";
import type { TourStep } from "@/modules/onboarding/tour-types";

const MOBILE_NAV = 1024;

async function ensureMobileNavVisible() {
  if (typeof window === "undefined" || window.innerWidth >= MOBILE_NAV) return;
  window.dispatchEvent(new CustomEvent("kc-tour-open-mobile-nav"));
  await new Promise((r) => setTimeout(r, 320));
}

export const platformMainSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Chào mừng đến KingCoin",
    description:
      "KingCoin là sàn giao dịch mô phỏng — bạn học trade như sàn thật mà không mất tiền thật. Đồng nền tảng KC (≈ USDT) dùng để mua token và tính vốn.",
    side: "over",
  },
  {
    id: "search",
    target: '[data-tour="header-search"]',
    title: "Tìm token nhanh",
    description:
      "Gõ tên hoặc mã token để nhảy tới cặp Spot/Futures. Hữu ích khi bạn biết symbol nhưng chưa quen menu.",
    side: "bottom",
    beforeShow: ensureMobileNavVisible,
  },
  {
    id: "nav-markets",
    target: '[data-tour="nav-markets"]',
    title: "Thị trường",
    description:
      "Xem toàn bộ token đang niêm yết: giá, biến động 24h, vốn hóa và khối lượng. Đây là điểm bắt đầu khi chọn coin để giao dịch.",
    side: "bottom",
    beforeShow: ensureMobileNavVisible,
  },
  {
    id: "markets-list",
    route: "/token/list",
    target: '[data-tour="markets-list"]',
    title: "Bảng thị trường",
    description:
      "Sắp xếp theo cột, thêm vào watchlist (⭐), bấm hàng để mở chi tiết hoặc vào Giao dịch. Token stablecoin KC không nằm trong bảng alt.",
    side: "top",
  },
  {
    id: "nav-trade",
    target: '[data-tour="nav-trade"]',
    route: "/token/list",
    title: "Giao dịch Spot",
    description:
      "Mở terminal giao dịch cặp BASE/KC — biểu đồ, sổ lệnh và form đặt lệnh nằm trên cùng một màn hình.",
    side: "bottom",
    beforeShow: ensureMobileNavVisible,
  },
  {
    id: "trade-chart",
    route: defaultTradeHref(),
    target: '[data-tour="trade-chart"]',
    title: "Biểu đồ giá",
    description:
      "Theo dõi xu hướng giá theo thời gian. Tab Tổng quan cho thêm thống kê token. Giá cập nhật live qua WebSocket.",
    side: "right",
  },
  {
    id: "trade-orderbook",
    target: '[data-tour="trade-orderbook"]',
    title: "Sổ lệnh (Order book)",
    description:
      "Bên trái là lệnh mua (bid), bên phải là lệnh bán (ask). Giá giữa là tham chiếu khớp lệnh thị trường.",
    side: "left",
  },
  {
    id: "trade-order",
    target: '[data-tour="trade-order"]',
    title: "Đặt lệnh Mua / Bán",
    description:
      "Dùng KC để mua alt hoặc bán alt lấy KC. Chọn Limit (đặt giá) hoặc Market (khớp ngay). Kiểm tra số dư KC trước khi gửi lệnh.",
    side: "left",
  },
  {
    id: "trade-my-orders",
    target: '[data-tour="trade-my-orders"]',
    title: "Lệnh của tôi",
    description:
      "Theo dõi lệnh đang chờ khớp, hủy lệnh hoặc xem lịch sử khớp. Sau mỗi lệnh thành công, số dư ví cập nhật tự động.",
    side: "top",
  },
  {
    id: "nav-account",
    target: '[data-tour="nav-account"]',
    title: "Tài sản & tài khoản",
    description:
      "Tổng quát NAV (KC + alt), tab Lịch sử (biến động ví & spot), và Thông tin hồ sơ.",
    side: "bottom",
    beforeShow: ensureMobileNavVisible,
  },
  {
    id: "account-overview",
    route: "/account/dashboard",
    target: '[data-tour="account-overview"]',
    title: "Tổng quát tài sản",
    description:
      "NAV quy KC theo giá spot. KC là stablecoin quote; alt được định giá lại theo thị trường.",
    side: "top",
  },
  {
    id: "nav-quest",
    target: '[data-tour="nav-quest"]',
    route: "/account/dashboard",
    title: "Nhiệm vụ — kiếm KC",
    description:
      "Hoàn thành quest (đăng ký, trade, mời bạn…) để nhận KC miễn phí — nguồn vốn chính cho người mới.",
    side: "bottom",
    beforeShow: ensureMobileNavVisible,
  },
  {
    id: "quest-list",
    route: "/quest",
    target: '[data-tour="quest-list"]',
    title: "Danh sách nhiệm vụ",
    description:
      "Tab Bắt đầu dành cho onboarding. Làm nhiệm vụ → Nhận thưởng KC → dùng KC để trade trên sàn.",
    side: "top",
  },
  {
    id: "nav-convert",
    target: '[data-tour="nav-convert"]',
    route: "/quest",
    title: "Chuyển đổi token",
    description:
      "Đổi trực tiếp giữa hai alt (hoặc qua KC) theo giá spot — không cần đặt lệnh limit trên sổ.",
    side: "bottom",
    beforeShow: ensureMobileNavVisible,
  },
  {
    id: "convert-form",
    route: "/convert",
    target: '[data-tour="convert-form"]',
    title: "Form chuyển đổi",
    description:
      "Chọn token gửi/nhận và số lượng. Tỷ giá ước tính theo giá KC hiện tại. Cần đăng nhập để thực hiện.",
    side: "top",
  },
  {
    id: "finish",
    title: "Bạn đã sẵn sàng!",
    description:
      "Gợi ý: làm quest đầu tiên để có KC, rồi thử đặt một lệnh nhỏ trên Spot. Bấm Hướng dẫn trên header bất cứ lúc nào để xem lại tour này.",
    side: "over",
  },
];

export const platformMainTourMeta = {
  id: "platform-main" as const,
  steps: platformMainSteps,
};
