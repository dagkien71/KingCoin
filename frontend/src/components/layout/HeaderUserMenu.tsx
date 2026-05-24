"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/store/hook";
import { logout } from "@/store/slice/authSlice";
import { deleteSessionToken } from "@/store/slice/sessionTokenSlice";
import {
  HiOutlineBell,
  HiOutlineChevronDown,
  HiOutlineLogout,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUserCircle,
} from "react-icons/hi";
import { useNotificationsOptional } from "@/context/notification-context";
import useAuth from "@/hooks/useAuth";
import { cn } from "@/lib/cn";

function userLabel(username?: string | null, email?: string | null) {
  if (username?.trim()) return username.trim();
  if (email?.trim()) return email.split("@")[0];
  return "Tài khoản";
}

function userInitials(username?: string | null, email?: string | null) {
  const s = userLabel(username, email);
  return s.slice(0, 2).toUpperCase();
}

export default function HeaderUserMenu() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAuth();
  const notif = useNotificationsOptional();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!auth?.isLogin) return null;

  const name = userLabel(auth.user?.username, auth.user?.email);
  const unread = notif?.unreadCount ?? 0;

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

  const menuItemClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-kc-fg transition-colors hover:bg-white/[0.06]";

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void notif?.refresh();
        }}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-kc-border py-1.5 pl-1.5 pr-2.5",
          "text-kc-fg transition-colors hover:bg-white/[0.04]",
          open && "bg-white/[0.06] ring-1 ring-kc-border"
        )}
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="true"
        aria-label="Menu tài khoản và thông báo"
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/20 text-xs font-bold text-violet-300">
          {userInitials(auth.user?.username, auth.user?.email)}
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-0.5 text-[9px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </span>
        <span className="hidden max-w-[7rem] truncate text-sm font-medium lg:block">
          {name}
        </span>
        <HiOutlineChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-kc-muted transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-[60] mt-2 w-[min(100vw-2rem,20rem)] overflow-hidden rounded-xl border border-kc-border bg-kc-bg shadow-xl animate-fade-in">
          <div className="border-b border-kc-border bg-kc-surface/40 px-3 py-3">
            <p className="truncate text-sm font-semibold text-kc-fg">{name}</p>
            {auth.user?.email ? (
              <p className="truncate text-xs text-kc-muted">{auth.user.email}</p>
            ) : null}
          </div>

          {notif ? (
            <div className="border-b border-kc-border">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-kc-muted">
                  <HiOutlineBell className="h-4 w-4" />
                  Thông báo
                  {unread > 0 ? (
                    <span className="rounded-full bg-violet-500/25 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
                      {unread}
                    </span>
                  ) : null}
                </span>
                {unread > 0 ? (
                  <button
                    type="button"
                    className="text-[11px] text-violet-400 hover:underline"
                    onClick={() => void notif.markAllRead()}
                  >
                    Đọc hết
                  </button>
                ) : null}
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-kc-border/50">
                {notif.items.length === 0 ? (
                  <p className="px-3 py-4 text-center text-xs text-kc-muted">
                    Chưa có thông báo
                  </p>
                ) : (
                  notif.items.slice(0, 5).map((item) => {
                    const href =
                      typeof item.payload?.deeplink === "string"
                        ? item.payload.deeplink
                        : "/notifications";
                    return (
                      <Link
                        key={item.id}
                        href={href}
                        onClick={() => {
                          setOpen(false);
                          if (!item.readAt) void notif.markRead(item.id);
                        }}
                        className={cn(
                          "block px-3 py-2 hover:bg-white/[0.04]",
                          !item.readAt && "bg-violet-500/8"
                        )}
                      >
                        <p className="line-clamp-1 text-xs font-medium text-kc-fg">
                          {item.title}
                        </p>
                        <p className="line-clamp-1 text-[11px] text-kc-muted">
                          {item.body}
                        </p>
                      </Link>
                    );
                  })
                )}
              </div>
              <div className="flex gap-1 border-t border-kc-border/60 p-2">
                <Link
                  href="/notifications"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-md py-1.5 text-center text-xs font-medium text-violet-400 hover:bg-white/[0.04]"
                >
                  Xem tất cả
                </Link>
                <button
                  type="button"
                  className="flex-1 rounded-md py-1.5 text-center text-[11px] text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg"
                  onClick={() => void notif.enableWebPush()}
                >
                  Bật push
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-0.5 p-2">
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                setOpen(false);
                router.push("/account");
              }}
            >
              <HiOutlineUserCircle className="h-5 w-5 text-kc-muted" />
              Tài khoản
            </button>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                setOpen(false);
                router.push("/issuer");
              }}
            >
              <HiOutlineSparkles className="h-5 w-5 text-emerald-400/90" />
              KingCoin Studio
            </button>
            {auth.isAdmin ? (
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  setOpen(false);
                  router.push("/admin");
                }}
              >
                <HiOutlineShieldCheck className="h-5 w-5 text-violet-400/90" />
                Console
              </button>
            ) : null}
          </div>

          <div className="border-t border-kc-border p-2">
            <button
              type="button"
              className={cn(menuItemClass, "text-kc-muted hover:text-red-300")}
              onClick={() => void handleLogout()}
            >
              <HiOutlineLogout className="h-5 w-5" />
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
