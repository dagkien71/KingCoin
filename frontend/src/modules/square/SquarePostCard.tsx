"use client";

import { Button } from "@/components/ui/button";
import useAuth from "@/hooks/useAuth";
import useMutation from "@/hooks/useMutation";
import { cn } from "@/lib/cn";
import {
  formatSquareRelativeTime,
  squareAuthorLabel,
  squareProfilePath,
} from "@/modules/square/square-utils";
import { SquareOrderShareCard } from "@/modules/square/SquareOrderShareCard";
import { SquarePostComments } from "@/modules/square/SquarePostComments";
import {
  SquareAvatar,
  SquareKindBadge,
  SquarePanel,
} from "@/modules/square/square-ui";
import type { SquarePost } from "@/types/square.type";
import { SQUARE_REACTIONS } from "@/types/square.type";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  HiOutlineChatAlt2,
  HiOutlineTrash,
} from "react-icons/hi";

const REACTION_EMOJI: Record<string, string> = {
  like: "♥",
  fire: "🔥",
  bull: "🐂",
  bear: "🐻",
  rocket: "🚀",
  eyes: "👀",
};

type Props = {
  post: SquarePost;
  onUpdated?: () => void;
  onDeleted?: () => void;
  /** Ẩn nút hồ sơ khi đang xem feed trên chính profile đó */
  hideProfileLink?: boolean;
};

export function SquarePostCard({
  post,
  onUpdated,
  onDeleted,
  hideProfileLink,
}: Props) {
  const { isLogin, user } = useAuth();
  const isOwnPost =
    user?.id != null && String(user.id) === String(post.author.id);
  const [showReactions, setShowReactions] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);

  useEffect(() => {
    setCommentCount(post.commentCount ?? 0);
  }, [post.commentCount]);
  const { mutate: setReaction, loading: reacting } = useMutation(
    "PATCH",
    `/square/posts/${post.id}/reactions`
  );
  const { mutate: votePoll, loading: voting } = useMutation(
    "POST",
    `/square/posts/${post.id}/poll/vote`
  );
  const { mutate: deletePost, loading: deleting } = useMutation(
    "DELETE",
    `/square/posts/${post.id}`
  );

  const handleReaction = async (emoji: string) => {
    if (!isLogin) {
      toast.info("Đăng nhập để tương tác");
      return;
    }
    const next = post.viewerReaction === emoji ? "" : emoji;
    const res = await setReaction({ emoji: next });
    if (res != null) onUpdated?.();
    setShowReactions(false);
  };

  const handleVote = async (optionId: string) => {
    if (!isLogin) {
      toast.info("Đăng nhập để bình chọn");
      return;
    }
    const res = await votePoll({ optionId });
    if (res != null) onUpdated?.();
  };

  const handleDelete = async () => {
    const ok = await deletePost({});
    if (ok != null) {
      toast.success("Đã xóa bài");
      onDeleted?.();
    }
  };

  const totalReactions = post.reactions.reduce((s, r) => s + r.count, 0);

  return (
    <SquarePanel className="transition hover:border-kc-border-strong">
      <header className="mb-3 flex items-start gap-3">
        <Link href={squareProfilePath(post.author)} className="shrink-0">
          <SquareAvatar author={post.author} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={squareProfilePath(post.author)}
              className="truncate font-semibold text-kc-fg hover:text-kc-accent"
            >
              {squareAuthorLabel(post.author)}
            </Link>
            <SquareKindBadge kind={post.kind} />
          </div>
          <time className="text-xs text-kc-muted">
            {formatSquareRelativeTime(post.createdAt)}
          </time>
        </div>
        {post.canDelete ? (
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleDelete()}
            className="rounded-lg p-2 text-kc-muted transition hover:bg-white/5 hover:text-kc-down"
            aria-label="Xóa bài"
          >
            <HiOutlineTrash className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      {post.body ? (
        <p className="mb-4 whitespace-pre-wrap text-[15px] leading-relaxed text-kc-fg/95">
          {post.body}
        </p>
      ) : null}

      {post.imageUrls?.length > 0 ? (
        <div
          className={cn(
            "mb-4 grid gap-2",
            post.imageUrls.length === 1 && "grid-cols-1",
            post.imageUrls.length === 2 && "grid-cols-2",
            post.imageUrls.length >= 3 && "grid-cols-2"
          )}
        >
          {post.imageUrls.map((url, i) => (
            <a
              key={`${url}-${i}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Xem ảnh full size"
              aria-label={`Ảnh đính kèm ${i + 1}`}
              className={cn(
                "block overflow-hidden rounded-xl border border-kc-border bg-kc-bg/40",
                post.imageUrls!.length === 1 && "max-h-96",
                post.imageUrls!.length >= 3 && i === 0 && "col-span-2 max-h-72"
              )}
            >
              <img
                src={url}
                alt=""
                className="h-full max-h-96 w-full object-cover transition hover:opacity-95"
              />
            </a>
          ))}
        </div>
      ) : null}

      {post.embed && post.kind === "order_spot" ? (
        <SquareOrderShareCard kind="order_spot" embed={post.embed} />
      ) : null}

      {post.embed && post.kind === "order_futures" ? (
        <SquareOrderShareCard kind="order_futures" embed={post.embed} />
      ) : null}

      {post.poll ? (
        <div className="mb-4 space-y-2">
          {post.poll.options.map((opt) => {
            const pct =
              post.poll!.totalVotes > 0
                ? Math.round((opt.voteCount / post.poll!.totalVotes) * 100)
                : 0;
            const selected = post.poll!.viewerOptionId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={voting}
                onClick={() => void handleVote(opt.id)}
                className={cn(
                  "relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left text-sm transition",
                  selected
                    ? "border-kc-accent/50 bg-kc-accent/10 ring-1 ring-kc-accent/30"
                    : "border-kc-border bg-kc-bg/40 hover:border-kc-border-strong hover:bg-kc-elevated/50"
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-kc-accent/20 transition-all"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative flex justify-between gap-3">
                  <span className="font-medium text-kc-fg">{opt.label}</span>
                  <span className="num shrink-0 text-kc-muted">
                    {pct}% · {opt.voteCount}
                  </span>
                </span>
              </button>
            );
          })}
          <p className="text-xs text-kc-muted">
            {post.poll.totalVotes} lượt bình chọn
          </p>
        </div>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2 border-t border-kc-border/60 pt-3">
        <div className="relative flex items-center gap-1">
          <button
            type="button"
            disabled={reacting}
            onClick={() => {
              if (!isLogin) {
                toast.info("Đăng nhập để thích");
                return;
              }
              if (post.viewerReaction) {
                void handleReaction(post.viewerReaction);
              } else {
                setShowReactions((v) => !v);
              }
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              post.viewerReaction
                ? "border-kc-accent/40 bg-kc-accent/15 text-kc-accent"
                : "border-kc-border bg-kc-bg/50 text-kc-muted hover:border-kc-border-strong hover:text-kc-fg"
            )}
          >
            {post.viewerReaction
              ? REACTION_EMOJI[post.viewerReaction] ?? post.viewerReaction
              : "♥"}
            {totalReactions > 0 ? (
              <span className="num text-kc-fg">{totalReactions}</span>
            ) : null}
          </button>
          {showReactions ? (
            <div className="absolute bottom-full left-0 z-20 mb-2 flex gap-0.5 rounded-xl border border-kc-border bg-kc-elevated p-1.5 shadow-lg">
              {SQUARE_REACTIONS.map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  title={r.label}
                  className="rounded-lg px-2.5 py-1.5 text-base transition hover:bg-white/10"
                  onClick={() => void handleReaction(r.emoji)}
                >
                  {REACTION_EMOJI[r.emoji] ?? r.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {post.reactions
          .filter((r) => r.count > 0 && r.emoji !== post.viewerReaction)
          .map((r) => (
            <span
              key={r.emoji}
              className="rounded-full border border-kc-border/60 bg-kc-bg/40 px-2 py-0.5 text-xs text-kc-muted"
            >
              {REACTION_EMOJI[r.emoji] ?? r.emoji}{" "}
              <span className="num">{r.count}</span>
            </span>
          ))}

        {!hideProfileLink && !isOwnPost ? (
          <Link href={squareProfilePath(post.author)} className="ml-auto">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5">
              <HiOutlineChatAlt2 className="h-4 w-4" />
              Hồ sơ &amp; nhắn tin
            </Button>
          </Link>
        ) : null}
      </footer>

      <SquarePostComments
        postId={post.id}
        commentCount={commentCount}
        onCommentCountChange={setCommentCount}
      />
    </SquarePanel>
  );
}
