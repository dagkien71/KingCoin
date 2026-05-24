"use client";

import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch } from "@/store/hook";
import { logout } from "@/store/slice/authSlice";
import { deleteSessionToken } from "@/store/slice/sessionTokenSlice";
import {
  HiOutlineChevronDown,
  HiOutlineLogout,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUserCircle,
} from "react-icons/hi";
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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-kc-border py-1.5 pl-1.5 pr-2.5",
          "text-kc-fg transition-colors hover:bg-white/[0.04]",
          open && "bg-white/[0.06] ring-1 ring-kc-border"
        )}
        aria-expanded={open ? "true" : "false"}
        aria-haspopup="true"
        aria-label="Menu tài khoản"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-500/20 text-xs font-bold text-violet-300">
          {userInitials(auth.user?.username, auth.user?.email)}
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
        <div className="absolute right-0 top-full z-[60] mt-2 w-[min(100vw-2rem,16rem)] overflow-hidden rounded-xl border border-kc-border bg-kc-bg shadow-xl animate-fade-in">
          <div className="border-b border-kc-border bg-kc-surface/40 px-3 py-3">
            <p className="truncate text-sm font-semibold text-kc-fg">{name}</p>
            {auth.user?.email ? (
              <p className="truncate text-xs text-kc-muted">{auth.user.email}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-0.5 p-2">
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                setOpen(false);
                router.push("/account/dashboard");
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
