"use client";

import { SquareComposer } from "@/modules/square/SquareComposer";
import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  HiOutlineChatAlt2,
  HiOutlineGlobeAlt,
  HiOutlinePencilAlt,
  HiOutlineUserGroup,
} from "react-icons/hi";

export type SquareCommunitySection = "feed" | "messages" | "profile";

type Props = {
  children: ReactNode;
  section: SquareCommunitySection;
  /** Hiện khối đăng bài trên sidebar (trang bảng tin / hồ sơ của mình) */
  showComposer?: boolean;
  onPosted?: () => void;
  /** Sidebar rộng hơn cho trang tin nhắn */
  wideMain?: boolean;
  /** Khóa chiều cao cột nội dung — tránh trang tin nhắn bị kéo dài / trượt */
  lockMainHeight?: boolean;
};

const NAV = [
  {
    id: "feed" as const,
    label: "Bảng tin",
    href: "/square",
    icon: HiOutlineGlobeAlt,
  },
  {
    id: "messages" as const,
    label: "Tin nhắn",
    href: "/square/messages",
    icon: HiOutlineChatAlt2,
  },
];

export function SquareCommunityLayout({
  children,
  section,
  showComposer = false,
  onPosted,
  wideMain = false,
  lockMainHeight = false,
}: Props) {
  return (
    <main className="min-h-screen bg-kc-bg px-4 py-6 sm:px-6 md:py-8">
      <div
        className={cn(
          "mx-auto flex flex-col gap-6 md:flex-row md:items-start",
          wideMain ? "max-w-6xl" : "max-w-5xl"
        )}
      >
        <aside className="w-full shrink-0 md:sticky md:top-24 md:w-64 lg:w-72 xl:w-80">
          <div className="space-y-4">
            <div className="rounded-2xl border border-kc-border bg-kc-surface/90 p-4 shadow-kc-glow sm:p-5">
              <div className="flex items-center gap-2 text-kc-accent">
                <HiOutlineUserGroup className="h-5 w-5" aria-hidden />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  KingCoin
                </span>
              </div>
              <h1 className="mt-2 text-xl font-bold text-kc-fg sm:text-2xl">
                <span className="text-gradient-kc">Cộng đồng</span>
              </h1>
              <p className="mt-1.5 text-xs leading-relaxed text-kc-muted">
                Chia sẻ nhận định, lệnh đang mở và bình chọn cùng trader.
              </p>
            </div>

            <nav
              className={cn(
                "rounded-2xl border border-kc-border p-2",
                "max-md:sticky max-md:top-16 max-md:z-30 max-md:bg-kc-bg max-md:shadow-[0_4px_20px_rgba(0,0,0,0.35)]",
                "md:bg-kc-surface/80"
              )}
              aria-label="Điều hướng cộng đồng"
            >
              <ul className="space-y-1">
                {NAV.map((item) => {
                  const isActive = item.id === section;
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                          isActive
                            ? "bg-kc-accent/15 text-kc-accent"
                            : "text-kc-muted hover:bg-white/[0.04] hover:text-kc-fg"
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {showComposer ? (
              <div className="rounded-2xl border border-kc-border bg-kc-surface/80 p-3 shadow-kc-glow sm:p-4">
                <div className="mb-3 flex items-center gap-2 border-b border-kc-border/60 pb-2">
                  <HiOutlinePencilAlt className="h-4 w-4 text-kc-accent" />
                  <h2 className="text-sm font-semibold text-kc-fg">Bài đăng</h2>
                </div>
                <SquareComposer compact onPosted={onPosted} />
              </div>
            ) : null}
          </div>
        </aside>

        <div
          className={cn(
            "min-w-0 flex-1",
            lockMainHeight ? "min-h-0 overflow-hidden" : "space-y-6",
            wideMain && !lockMainHeight && "lg:min-h-[calc(100vh-8rem)]"
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
