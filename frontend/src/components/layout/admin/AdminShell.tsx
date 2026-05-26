"use client";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { ADMIN_NAV, isAdminNavActive } from "@/modules/admin/admin-nav";
import NotificationBell from "@/components/notifications/NotificationBell";
import { AdminGate } from "@/modules/admin/AdminGate";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineLogout,
  HiOutlineShieldCheck,
} from "react-icons/hi";
import { useAppDispatch } from "@/store/hook";
import { logout } from "@/store/slice/authSlice";
import { deleteSessionToken } from "@/store/slice/sessionTokenSlice";

type Props = {
  children: ReactNode;
};

export default function AdminShell({ children }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isLogin } = useAuth();

  const handleLogout = async () => {
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
    <div className="relative min-h-screen bg-[#06050c] text-kc-fg">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_10%_0%,rgba(139,92,246,0.14),transparent),radial-gradient(ellipse_50%_40%_at_90%_100%,rgba(212,160,18,0.08),transparent)]" />

      <header className="relative z-20 border-b border-violet-500/20 bg-[#0c0a14]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/25">
              <HiOutlineShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-kc-fg">
                KingCoin Control
              </p>
              <p className="truncate text-[11px] text-violet-400/90">
                Chế độ quản trị · chỉ admin
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden text-kc-muted hover:text-kc-fg sm:inline-flex"
              onClick={() => router.push("/token/list")}
            >
              <HiOutlineArrowLeft className="h-4 w-4" />
              Quay về sàn
            </Button>
            {isLogin ? (
              <>
                <NotificationBell />
                <span className="hidden max-w-[9rem] truncate text-xs text-kc-muted md:inline">
                  {user?.username || user?.email}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleLogout()}
                  aria-label="Đăng xuất"
                >
                  <HiOutlineLogout className="h-4 w-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:py-8">
        <aside className="md:w-52 md:shrink-0 lg:w-56">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-violet-500/20 bg-[#100d18]/80 p-1 md:flex-col md:overflow-visible md:p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ADMIN_NAV.map((item) => {
              const active = isAdminNavActive(router.pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-violet-500/20 text-violet-200"
                      : "text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 hidden rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-4 md:block">
            <p className="text-xs font-medium uppercase tracking-wider text-violet-400/80">
              Control room
            </p>
            <p className="mt-2 text-xs leading-relaxed text-kc-muted">
              Tách khỏi giao dịch hàng ngày — điều khiển MM, preset giá và giám sát
              chart.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-10">
          <AdminGate>{children}</AdminGate>
        </div>
      </div>
    </div>
  );
}
