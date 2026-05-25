"use client";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import {
  connectUserSocket,
  getUserSocket,
} from "@/lib/user-realtime-socket";
import {
  onSquareMessage,
  subscribeSquareConv,
  unsubscribeSquareConv,
} from "@/lib/square-realtime";
import { cn } from "@/lib/cn";
import { formatSquareRelativeTime } from "@/modules/square/square-utils";
import { squareInputClass } from "@/modules/square/square-ui";
import type { SquareMessageList } from "@/types/square.type";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HiOutlinePaperAirplane } from "react-icons/hi";
import { useAppSelector } from "@/store/hook";
import { RootState } from "@/store/store";

type Props = {
  conversationId: string;
};

export function SquareThread({ conversationId }: Props) {
  const { isLogin } = useAuth();
  const sessionToken = useAppSelector(
    (s: RootState) => s.sessionToken.sessionToken
  );
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrolledIdRef = useRef<string | null>(null);
  const scrollAfterSendRef = useRef(false);

  const path = isLogin
    ? `/square/conversations/${conversationId}/messages`
    : "";

  const { data, loading, refetch } = useFetchApi<SquareMessageList>(path, {
    defaultParams: { limit: 50 },
    refreshInterval: 30_000,
    silentOnPoll: true,
  });

  const { mutate: send, loading: sending } = useMutation(
    "POST",
    `/square/conversations/${conversationId}/messages`
  );

  useEffect(() => {
    if (!sessionToken) return;
    connectUserSocket(sessionToken);
  }, [sessionToken]);

  useEffect(() => {
    if (!conversationId || !isLogin) return;
    subscribeSquareConv(conversationId);
    const silentRefetch = () => void refetch({ silent: true });
    const off = onSquareMessage((payload) => {
      const p = payload as { conversationId?: string };
      if (p?.conversationId === conversationId) silentRefetch();
    });
    const socket = getUserSocket();
    const onUserMsg = (payload: unknown) => {
      const p = payload as { conversationId?: string };
      if (p?.conversationId === conversationId) silentRefetch();
    };
    socket?.on("square:message", onUserMsg);
    return () => {
      off();
      socket?.off("square:message", onUserMsg);
      unsubscribeSquareConv(conversationId);
    };
  }, [conversationId, isLogin, refetch]);

  const messages = [...(data?.items ?? [])].reverse();

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;

    const force = scrollAfterSendRef.current;
    scrollAfterSendRef.current = false;

    const isNewMessage = last.id !== lastScrolledIdRef.current;
    if (!force && !isNewMessage) return;

    lastScrolledIdRef.current = last.id;
    scrollToBottom(force ? "smooth" : "auto");
  }, [messages]);

  const handleSend = async () => {
    const text = body.trim();
    if (!text) return;
    const res = await send({ body: text });
    if (res != null) {
      setBody("");
      scrollAfterSendRef.current = true;
      void refetch();
    }
  };

  if (!isLogin) {
    return (
      <p className="p-8 text-center text-sm text-kc-muted">
        <Link href="/login" className="text-kc-accent hover:underline">
          Đăng nhập
        </Link>{" "}
        để nhắn tin.
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
      >
        {loading && messages.length === 0 ? (
          <p className="text-center text-sm text-kc-muted">Đang tải…</p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.isMine ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[min(85%,20rem)] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                m.isMine
                  ? "rounded-br-md bg-kc-accent text-kc-bg"
                  : "rounded-bl-md border border-kc-border bg-kc-surface text-kc-fg"
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  m.isMine ? "text-kc-bg/70" : "text-kc-muted"
                )}
              >
                {formatSquareRelativeTime(m.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 gap-2 border-t border-kc-border bg-kc-surface/80 p-4">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Nhập tin nhắn…"
          className={cn(squareInputClass, "flex-1")}
        />
        <Button
          type="button"
          disabled={sending || !body.trim()}
          onClick={() => void handleSend()}
          className="shrink-0 px-3"
          aria-label="Gửi"
        >
          <HiOutlinePaperAirplane className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
