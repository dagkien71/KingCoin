"use client";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import useConfigApi from "@/hooks/useConfigApi";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import { onSquareFeedEvent } from "@/lib/square-realtime";
import { cn } from "@/lib/cn";
import {
  formatSquareRelativeTime,
  squareAuthorLabel,
} from "@/modules/square/square-utils";
import { SquareAvatar, squareInputClass } from "@/modules/square/square-ui";
import { useAppSelector } from "@/store/hook";
import { RootState } from "@/store/store";
import type { IResponse } from "@/types/response";
import type { SquareComment, SquareCommentList } from "@/types/square.type";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { HiOutlineChatAlt2 } from "react-icons/hi";
import { toast } from "react-toastify";

type Props = {
  postId: string;
  commentCount: number;
  onCommentCountChange?: (count: number) => void;
};

export function SquarePostComments({
  postId,
  commentCount: commentCountProp,
  onCommentCountChange,
}: Props) {
  const { isLogin } = useAuth();
  const Api = useConfigApi();
  const sessionToken = useAppSelector(
    (state: RootState) => state.sessionToken.sessionToken
  );
  const [open, setOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(commentCountProp);
  const [body, setBody] = useState("");
  const [olderItems, setOlderItems] = useState<SquareComment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    setCommentCount(commentCountProp);
  }, [commentCountProp]);

  const listPath = open && postId ? `/square/posts/${postId}/comments` : "";

  const { data, loading, refetch } = useFetchApi<SquareCommentList>(listPath, {
    refreshInterval: open ? 25_000 : undefined,
    silentOnPoll: true,
  });

  useEffect(() => {
    if (!listPath) return;
    void refetch();
  }, [sessionToken, listPath, refetch]);

  const { mutate: postComment, loading: posting } = useMutation<SquareComment>(
    "POST",
    listPath
  );
  const { mutate: deleteComment } = useMutation<{ ok: true }>(
    "DELETE",
    "/square/comments/placeholder"
  );

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

  const applyCount = useCallback(
    (n: number) => {
      setCommentCount(n);
      onCommentCountChange?.(n);
    },
    [onCommentCountChange]
  );

  useEffect(() => {
    if (!open) return;
    const off = onSquareFeedEvent((ev, payload) => {
      const p = payload as {
        postId?: string;
        commentCount?: number;
      };
      if (p?.postId !== postId) return;
      if (
        ev === "square:comment_created" ||
        ev === "square:comment_deleted"
      ) {
        if (typeof p.commentCount === "number") {
          applyCount(p.commentCount);
        }
        void refetch();
      }
    });
    return off;
  }, [open, postId, refetch, applyCount]);

  const canDeleteComment = useCallback(
    (c: SquareComment) => Boolean(sessionToken) && c.canDelete === true,
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
        ? (res.data as SquareComment)
        : (res as SquareComment | undefined);
    if (created?.id) {
      setBody("");
      applyCount(commentCount + 1);
      toast.success("Đã gửi bình luận");
      void refetch();
    }
  };

  const handleDelete = async (commentId: string) => {
    const res = await deleteComment(undefined, `/square/comments/${commentId}`);
    if (res !== undefined) {
      setOlderItems((prev) => prev.filter((c) => c.id !== commentId));
      applyCount(Math.max(0, commentCount - 1));
      toast.success("Đã xóa bình luận");
      void refetch();
    }
  };

  const loadMore = async () => {
    if (!effectiveCursor || !listPath) return;
    try {
      const res = await Api.get<IResponse<SquareCommentList>>(
        `${listPath}?limit=20&cursor=${encodeURIComponent(effectiveCursor)}`
      );
      const page = res.data?.data ?? (res.data as unknown as SquareCommentList);
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

  const toggleOpen = () => {
    setOpen((v) => {
      if (!v) {
        setOlderItems([]);
        setNextCursor(null);
      }
      return !v;
    });
  };

  return (
    <div className="mt-3 pt-1">
      <button
        type="button"
        onClick={toggleOpen}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition",
          open
            ? "bg-kc-accent/10 text-kc-accent"
            : "bg-kc-bg/50 text-kc-muted hover:bg-kc-bg/80 hover:text-kc-fg"
        )}
      >
        <HiOutlineChatAlt2 className="h-4 w-4" />
        Bình luận
        {commentCount > 0 ? (
          <span className="num text-kc-fg">{commentCount}</span>
        ) : null}
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          {isLogin ? (
            <div className="space-y-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Viết bình luận…"
                className={cn(
                  squareInputClass,
                  "resize-none border-0 text-sm shadow-none focus:border-0 focus:ring-0"
                )}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-kc-muted">{body.length}/500</span>
                <Button
                  type="button"
                  size="sm"
                  disabled={posting || !body.trim()}
                  onClick={() => void handleSubmit()}
                >
                  {posting ? "Đang gửi…" : "Gửi"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-kc-bg/40 px-3 py-3 text-center text-sm text-kc-muted">
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
              Chưa có bình luận — hãy là người đầu tiên.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {items.map((c) => (
                <li
                  key={c.id}
                  className="flex gap-2 py-2"
                >
                  <SquareAvatar author={c.author} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-kc-fg">
                          {squareAuthorLabel(c.author)}
                        </p>
                        <p className="text-xs text-kc-muted">
                          {formatSquareRelativeTime(c.createdAt)}
                        </p>
                      </div>
                      {canDeleteComment(c) ? (
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 text-kc-muted hover:bg-kc-surface hover:text-kc-down"
                          title="Xóa"
                          onClick={() => void handleDelete(c.id)}
                        >
                          <FaTrash className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-kc-fg/95">
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {effectiveCursor ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => void loadMore()}
            >
              Xem thêm bình luận
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
