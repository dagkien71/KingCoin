import {
  HiOutlineCollection,
  HiOutlineHome,
  HiOutlinePlusCircle,
} from "react-icons/hi";

export type IssuerNavItem = {
  label: string;
  href: string;
  icon: typeof HiOutlineHome;
  exact?: boolean;
};

export const ISSUER_NAV: IssuerNavItem[] = [
  { label: "Tổng quan", href: "/issuer", icon: HiOutlineHome, exact: true },
  {
    label: "Phát hành mới",
    href: "/issuer/create",
    icon: HiOutlinePlusCircle,
  },
  {
    label: "Token của tôi",
    href: "/issuer/tokens",
    icon: HiOutlineCollection,
  },
];

export function isIssuerNavActive(pathname: string, item: IssuerNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname.startsWith(item.href);
}
