import {
  HiOutlineChartSquareBar,
  HiOutlineClipboardList,
  HiOutlineHome,
  HiOutlineTrendingUp,
  HiOutlineUserGroup,
} from "react-icons/hi";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: typeof HiOutlineHome;
  exact?: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Tổng quan", href: "/admin", icon: HiOutlineHome, exact: true },
  {
    label: "Người dùng",
    href: "/admin/users",
    icon: HiOutlineUserGroup,
  },
  {
    label: "Duyệt niêm yết",
    href: "/admin/listing-requests",
    icon: HiOutlineClipboardList,
  },
  {
    label: "Điều khiển thị trường",
    href: "/admin/market-control",
    icon: HiOutlineTrendingUp,
  },
  {
    label: "Lưới biểu đồ",
    href: "/admin/charts",
    icon: HiOutlineChartSquareBar,
  },
];

export function isAdminNavActive(pathname: string, item: AdminNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href);
}
