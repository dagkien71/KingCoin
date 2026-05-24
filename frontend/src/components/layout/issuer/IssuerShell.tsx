"use client";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { ISSUER_NAV, isIssuerNavActive } from "@/modules/issuer/issuer-nav";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineLogout,
  HiOutlineSparkles,
} from "react-icons/hi";
import { useAppDispatch } from "@/store/hook";
import { logout } from "@/store/slice/authSlice";
import { deleteSessionToken } from "@/store/slice/sessionTokenSlice";

type Props = {
  children: ReactNode;
};

export default function IssuerShell({ children }: Props) {
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
    <div className="relative min-h-screen bg-[#070b12] text-kc-fg">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_45%_at_20%_0%,rgba(16,185,129,0.12),transparent),radial-gradient(ellipse_50%_40%_at_100%_100%,rgba(212,160,18,0.06),transparent)]" />

      <header className="relative z-20 border-b border-emerald-500/15 bg-[#0a1018]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/issuer" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <HiOutlineSparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-kc-fg">
                KingCoin Studio
              </p>
              <p className="truncate text-[11px] text-emerald-400/90">
                Chế độ nhà phát hành
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

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:py-8">
        <aside className="lg:w-56 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-emerald-500/15 bg-[#0d141f]/80 p-1 lg:flex-col lg:overflow-visible lg:p-2">
            {ISSUER_NAV.map((item) => {
              const active = isIssuerNavActive(router.pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 hidden rounded-xl border border-kc-border/60 bg-kc-elevated/40 p-4 lg:block">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/80">
              Mẹo
            </p>
            <p className="mt-2 text-xs leading-relaxed text-kc-muted">
              Studio tách biệt khỏi tab giao dịch — tập trung phát hành và quản
              lý token bạn sở hữu.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 w-full text-xs"
              onClick={() => router.push("/token/list")}
            >
              Mở thị trường
            </Button>
          </div>
        </aside>

        <div className="min-w-0 flex-1 pb-10">{children}</div>
      </div>
    </div>
  );
}
