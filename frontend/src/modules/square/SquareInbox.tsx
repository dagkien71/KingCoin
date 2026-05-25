"use client";

import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import { onSquareMessage } from "@/lib/square-realtime";
import { cn } from "@/lib/cn";
import {
  formatSquareRelativeTime,
  squareAuthorLabel,
} from "@/modules/square/square-utils";
import { SquareAvatar } from "@/modules/square/square-ui";
import type { SquareConversationItem } from "@/types/square.type";
import Link from "next/link";
import { useEffect } from "react";

type Props = {
  activeId?: string;
};

export function SquareInbox({ activeId }: Props) {
  const { isLogin } = useAuth();
  const { data, loading, refetch } = useFetchApi<SquareConversationItem[]>(
    isLogin ? "/square/conversations" : "",
    { refreshInterval: 30_000, silentOnPoll: true }
  );

  useEffect(() => {
    if (!isLogin) return;
    const off = onSquareMessage(() => {
      void refetch({ silent: true });
    });
    return off;
  }, [isLogin, refetch]);

  if (!isLogin) {
    return (
      <p className="p-6 text-center text-sm text-kc-muted">
        <Link href="/login" className="text-kc-accent hover:underline">
          Đăng nhập
        </Link>{" "}
        để xem tin nhắn.
      </p>
    );
  }

  const list = data ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-kc-border px-4 py-3">
        <h2 className="text-sm font-semibold text-kc-fg">Hội thoại</h2>
      </div>
      {loading && list.length === 0 ? (
        <p className="p-6 text-center text-sm text-kc-muted">Đang tải…</p>
      ) : null}
      <ul className="flex-1 overflow-y-auto">
        {list.map((c) => (
          <li key={c.id}>
            <Link
              href={`/square/messages/${c.id}`}
              className={cn(
                "flex gap-3 px-4 py-3 transition",
                activeId === c.id
                  ? "bg-kc-accent/10 border-l-2 border-l-kc-accent"
                  : "border-l-2 border-l-transparent hover:bg-white/[0.03]"
              )}
            >
              <SquareAvatar author={c.otherUser} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-kc-fg">
                    {squareAuthorLabel(c.otherUser)}
                  </span>
                  <span className="shrink-0 text-[10px] text-kc-muted">
                    {formatSquareRelativeTime(c.lastMessageAt)}
                  </span>
                </div>
                <p className="truncate text-sm text-kc-muted">
                  {c.lastMessagePreview ?? "—"}
                </p>
              </div>
              {c.unreadCount > 0 ? (
                <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-kc-accent px-1.5 text-[10px] font-bold text-kc-bg">
                  {c.unreadCount}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 && !loading ? (
        <p className="p-6 text-center text-sm text-kc-muted">
          Chưa có hội thoại.
        </p>
      ) : null}
    </div>
  );
}
