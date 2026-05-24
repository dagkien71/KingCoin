"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useAuth from "@/hooks/useAuth";
import useConfigApi from "@/hooks/useConfigApi";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import { useAppSelector } from "@/store/hook";
import { RootState } from "@/store/store";
import type { ITokenComment, ITokenCommentList } from "@/types/comment.type";
import { isStablecoinToken } from "@/types/stablecoin.type";
import type { IResponse } from "@/types/response";
import type { ITokenCrypto } from "@/types/token.type";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaComment, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "vừa xong";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "vừa xong";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  return `${day} ngày trước`;
}

function authorLabel(author: ITokenComment["author"]): string {
  return author.username?.trim() || `User ${author.id.slice(-6)}`;
}

type Props = {
  token: ITokenCrypto;
};

export function TokenCommentPanel({ token }: Props) {
  const Api = useConfigApi();
  const { isLogin } = useAuth();
  const sessionToken = useAppSelector(
    (state: RootState) => state.sessionToken.sessionToken
  );
  const tokenId = token?.id ?? "";
  const isStable = isStablecoinToken(token);
  const listPath = tokenId ? `/token-crypto/${tokenId}/comments` : "";

  const { data, loading, refetch } = useFetchApi<ITokenCommentList>(listPath, {
    refreshInterval: 20_000,
    silentOnPoll: true,
  });

  useEffect(() => {
    if (!listPath) return;
    void refetch();
  }, [sessionToken, listPath, refetch]);

  const { mutate: postComment, loading: posting } = useMutation<ITokenComment>(
    "POST",
    listPath
  );
  const { mutate: deleteComment } = useMutation<{ ok: true }>(
    "DELETE",
    "/comments/placeholder"
  );

  const [body, setBody] = useState("");
  const [olderItems, setOlderItems] = useState<ITokenComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const items = useMemo(() => {
    const base = data?.items ?? [];
    const ids = new Set(base.map((c) => c.id));
    const merged = [...base];
    for (const c of olderItems) {
      if (!ids.has(c.id)) merged.push(c);
    }
    return merged;
  }, [data?.items, olderItems]);

  const effectiveCursor = nextCursor ?? data?.nextCursor ?? null;

  /** API sets canDelete from Bearer JWT — không so khớp Redux user (dễ lệch sau đổi tài khoản). */
  const canDeleteComment = useCallback(
    (c: ITokenComment) => Boolean(sessionToken) && c.canDelete === true,
    [sessionToken]
  );

  const handleSubmit = async () => {
    const text = body.trim();
    if (!text) {
      toast.warn("Nhập nội dung bình luận");
      return;
    }
    const res = await postComment({ body: text });
    const created =
      res && typeof res === "object" && "data" in res && res.data
        ? (res.data as ITokenComment)
        : (res as ITokenComment | undefined);
    if (created?.id) {
      setBody("");
      toast.success("Đã gửi bình luận");
      void refetch();
    }
  };

  const handleDelete = async (commentId: string) => {
    const res = await deleteComment(undefined, `/comments/${commentId}`);
    if (res !== undefined) {
      setOlderItems((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Đã xóa bình luận");
      void refetch();
    }
  };

  const loadMore = async () => {
    if (!effectiveCursor || !listPath) return;
    try {
      const res = await Api.get<IResponse<ITokenCommentList>>(
        `${listPath}?limit=20&cursor=${encodeURIComponent(effectiveCursor)}`
      );
      const page = res.data?.data ?? (res.data as unknown as ITokenCommentList);
      if (page?.items?.length) {
        setOlderItems((prev) => {
          const ids = new Set([
            ...(data?.items ?? []).map((i) => i.id),
            ...prev.map((p) => p.id),
          ]);
          return [...prev, ...page.items.filter((i) => !ids.has(i.id))];
        });
      }
      setNextCursor(page?.nextCursor ?? null);
    } catch {
      toast.error("Không tải thêm được bình luận");
    }
  };

  if (isStable) {
    return (
      <Card className="border-kc-border bg-kc-elevated">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <FaComment className="h-8 w-8 text-kc-muted/60" />
          <p className="text-sm font-medium text-kc-fg">Bình luận</p>
          <p className="max-w-sm text-xs text-kc-muted">
            Token stablecoin (KC) không mở bình luận cộng đồng.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-kc-border bg-kc-elevated">
      <CardHeader className="border-b border-kc-border py-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <FaComment className="h-4 w-4 text-kc-accent" />
          Cộng đồng & bình luận
        </CardTitle>
        <p className="text-xs text-kc-muted">
          {items.length > 0
            ? `${items.length} bình luận gần đây`
            : "Chưa có bình luận — hãy là người đầu tiên"}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {isLogin ? (
          <div className="space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Chia sẻ quan điểm về token này…"
              className="w-full resize-none rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-sm text-kc-fg placeholder:text-kc-muted focus:border-kc-accent focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-kc-muted">{body.length}/500</span>
              <Button
                type="button"
                size="sm"
                disabled={posting || !body.trim()}
                onClick={() => void handleSubmit()}
              >
                {posting ? "Đang gửi…" : "Gửi bình luận"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-kc-border bg-kc-bg/50 px-3 py-4 text-center text-sm text-kc-muted">
            <Link href="/login" className="text-kc-accent hover:underline">
              Đăng nhập
            </Link>{" "}
            để bình luận
          </p>
        )}

        {loading && items.length === 0 ? (
          <p className="text-center text-sm text-kc-muted">Đang tải…</p>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-kc-muted">
            Chưa có bình luận nào.
          </p>
        ) : (
          <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {items.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-kc-border bg-kc-bg/40 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {c.author.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.author.avatar}
                          alt=""
                          className="h-7 w-7 rounded-full border border-kc-border object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-kc-surface text-xs font-medium text-kc-muted">
                          {authorLabel(c.author).charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-medium text-kc-fg">
                          {authorLabel(c.author)}
                        </p>
                        <p className="text-xs text-kc-muted">
                          {formatRelativeTime(c.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-kc-fg">
                      {c.body}
                    </p>
                  </div>
                  {canDeleteComment(c) && (
                    <button
                      type="button"
                      className="shrink-0 rounded p-1.5 text-kc-muted hover:bg-kc-surface hover:text-kc-down"
                      title="Xóa"
                      onClick={() => void handleDelete(c.id)}
                    >
                      <FaTrash className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {effectiveCursor && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => void loadMore()}
          >
            Xem thêm
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
