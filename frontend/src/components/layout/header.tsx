import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAppDispatch } from "@/store/hook";
import { logout } from "@/store/slice/authSlice";
import { deleteSessionToken } from "@/store/slice/sessionTokenSlice";
import {
  HiMenuAlt3,
  HiOutlineChartSquareBar,
  HiOutlineLogin,
  HiOutlineQuestionMarkCircle,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineSwitchHorizontal,
  HiX,
} from "react-icons/hi";
import HeaderUserMenu from "@/components/layout/HeaderUserMenu";
import NotificationBell from "@/components/notifications/NotificationBell";
import SearchForm from "../search";
import useAuth from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { defaultTradeHref } from "@/lib/token-routes";
import { useTourOptional } from "@/modules/onboarding/TourProvider";
import { PLATFORM_MAIN_TOUR_ID } from "@/modules/onboarding/tour-types";

const NAV = [
  { label: "Thị trường", href: "/token/list", tourId: "nav-markets" },
  { label: "Giao dịch", href: defaultTradeHref(), tourId: "nav-trade" },
  { label: "Futures", href: "/futures", tourId: "nav-futures" },
  { label: "Cộng đồng", href: "/square", tourId: "nav-square" },
  { label: "Tài sản", href: "/account/dashboard", tourId: "nav-account" },
  { label: "Nhiệm vụ", href: "/quest", tourId: "nav-quest" },
  { label: "Chuyển đổi", href: "/convert", tourId: "nav-convert" },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/token/list") return pathname.startsWith("/token/list");
  if (href.startsWith("/trade")) return pathname.startsWith("/trade");
  if (href === "/futures") return pathname.startsWith("/futures");
  if (href === "/account/dashboard")
    return pathname.startsWith("/account");
  if (href === "/quest") return pathname.startsWith("/quest");
  if (href === "/convert") return pathname.startsWith("/convert");
  if (href === "/square") return pathname.startsWith("/square");
  return pathname === href;
}

export default function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAuth();
  const tour = useTourOptional();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openNav = () => setOpen(true);
    const closeNav = () => setOpen(false);
    window.addEventListener("kc-tour-open-mobile-nav", openNav);
    window.addEventListener("kc-tour-close-mobile-nav", closeNav);
    return () => {
      window.removeEventListener("kc-tour-open-mobile-nav", openNav);
      window.removeEventListener("kc-tour-close-mobile-nav", closeNav);
    };
  }, []);

  const goLogin = () => {
    setOpen(false);
    router.push("/login");
  };

  const handleLogout = async () => {
    setOpen(false);
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      /* ignore */
    }
    dispatch(deleteSessionToken());
    dispatch(logout());
    router.push("/login");
  };

  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 z-50 border-b border-kc-border",
        "bg-kc-bg shadow-[0_4px_24px_rgba(0,0,0,0.45)]",
        "md:bg-kc-bg/90 md:backdrop-blur-lg md:shadow-none"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6 lg:gap-10">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-kc-accent text-kc-bg font-bold text-sm shadow-kc-glow">
              K
            </span>
            <span className="hidden font-semibold tracking-tight sm:block">
              <span className="text-kc-fg">King</span>
              <span className="text-gradient-kc">Coin</span>
            </span>
          </Link>

          <nav className="hidden md:flex min-w-0 max-w-[min(100%,48vw)] items-center gap-0.5 overflow-x-auto lg:max-w-none lg:gap-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tourId}
                className={cn(
                  "shrink-0 rounded-lg px-2 py-2 text-xs font-medium transition-colors md:px-2.5 lg:px-3 lg:text-sm",
                  isNavActive(router.pathname, item.href)
                    ? "bg-white/[0.06] text-kc-fg"
                    : "text-kc-muted hover:text-kc-fg hover:bg-white/[0.04]"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div
            className="hidden w-[200px] shrink-0 md:block lg:w-[280px] xl:w-[360px]"
            data-tour="header-search"
          >
            <SearchForm />
          </div>

          {tour ? (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="hidden shrink-0 sm:inline-flex"
              aria-label="Hướng dẫn sử dụng"
              onClick={() =>
                tour.startTour(PLATFORM_MAIN_TOUR_ID, { force: true })
              }
              disabled={tour.isRunning}
            >
              <HiOutlineQuestionMarkCircle className="h-4 w-4" />
              <span className="hidden xl:inline">Hướng dẫn</span>
            </Button>
          ) : null}

          <div className="hidden sm:flex items-center gap-2">
            {auth?.isLogin ? (
              <>
                <NotificationBell />
                <HeaderUserMenu />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={goLogin}>
                  <HiOutlineLogin className="h-4 w-4" />
                  Đăng nhập
                </Button>
                <Button variant="primary" size="sm" onClick={() => router.push("/register")}>
                  Đăng ký
                </Button>
              </>
            )}
          </div>

          {auth?.isLogin ? (
            <div className="sm:hidden">
              <NotificationBell />
            </div>
          ) : null}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-kc-border text-kc-fg md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Mở menu"
          >
            <HiMenuAlt3 className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-kc-border bg-kc-bg shadow-kc-glow animate-fade-in">
            <div className="flex items-center justify-between border-b border-kc-border bg-kc-surface px-4 py-4">
              <span className="font-semibold text-kc-fg">Menu</span>
              <button
                type="button"
                className="rounded-lg p-2 text-kc-muted hover:bg-white/[0.06] hover:text-kc-fg"
                onClick={() => setOpen(false)}
                aria-label="Đóng"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-kc-border p-4" data-tour="header-search">
              <SearchForm />
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={item.tourId}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-kc-fg hover:bg-kc-surface"
                >
                  {item.href.includes("trade") ? (
                    <HiOutlineChartSquareBar className="h-5 w-5 text-kc-muted" />
                  ) : item.href.includes("convert") ? (
                    <HiOutlineSwitchHorizontal className="h-5 w-5 text-kc-muted" />
                  ) : (
                    <HiOutlineChartSquareBar className="h-5 w-5 text-kc-muted" />
                  )}
                  {item.label}
                </Link>
              ))}
              {auth?.isLogin ? (
                <Link
                  href="/issuer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-emerald-400 hover:bg-kc-surface"
                >
                  <HiOutlineSparkles className="h-5 w-5" />
                  KingCoin Studio
                </Link>
              ) : null}
              {auth?.isAdmin ? (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-violet-400 hover:bg-kc-surface"
                >
                  <HiOutlineShieldCheck className="h-5 w-5" />
                  KingCoin Control
                </Link>
              ) : null}
            </nav>
            {tour ? (
              <div className="border-b border-kc-border p-3">
                <Button
                  variant="secondary"
                  className="w-full"
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    tour.startTour(PLATFORM_MAIN_TOUR_ID, { force: true });
                  }}
                  disabled={tour.isRunning}
                >
                  <HiOutlineQuestionMarkCircle className="h-5 w-5" />
                  Hướng dẫn sử dụng
                </Button>
              </div>
            ) : null}
            <div className="mt-auto border-t border-kc-border p-4">
              {auth?.isLogin ? (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      router.push("/account/dashboard");
                    }}
                  >
                    Tài khoản
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={handleLogout}>
                    Đăng xuất
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button variant="primary" className="w-full" onClick={goLogin}>
                    Đăng nhập
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setOpen(false);
                      router.push("/register");
                    }}
                  >
                    Đăng ký
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
