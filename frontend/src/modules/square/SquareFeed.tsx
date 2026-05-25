"use client";

import { Button } from "@/components/ui/button";
import useFetchApi from "@/hooks/useFetchApi";
import { useSquareFeedLive } from "@/hooks/useSquareFeedLive";
import { SquarePostCard } from "@/modules/square/SquarePostCard";
import { SquareEmpty, SquareFeedSkeleton } from "@/modules/square/square-ui";
import type { SquareFeed } from "@/types/square.type";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Props = {
  feedPath?: string;
  /** Scroll + highlight bài (từ ?post= trên hồ sơ) */
  highlightPostId?: string | null;
};

export function SquareFeed({
  feedPath = "/square/feed",
  highlightPostId,
}: Props) {
  const liveRevision = useSquareFeedLive();
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<SquareFeed["items"]>([]);

  const { data, loading, refetch, setQueryParams } = useFetchApi<SquareFeed>(
    feedPath,
    {
      liveRevision,
      silentOnLive: true,
      defaultParams: { limit: 20 },
    }
  );

  useEffect(() => {
    setQueryParams((p) => ({
      ...p,
      limit: 20,
      ...(cursor ? { cursor } : {}),
    }));
  }, [cursor, setQueryParams]);

  useEffect(() => {
    if (!data) return;
    if (!cursor) {
      setItems(data.items);
    } else {
      setItems((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        const added = data.items.filter((x) => !ids.has(x.id));
        return [...prev, ...added];
      });
    }
  }, [data, cursor]);

  const refreshFeed = useCallback(() => {
    setCursor(null);
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (liveRevision > 0 && !cursor) {
      void refetch();
    }
  }, [liveRevision, cursor, refetch]);

  useEffect(() => {
    if (!highlightPostId || items.length === 0) return;
    const el = document.getElementById(`square-post-${highlightPostId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-kc-accent/50");
    const t = window.setTimeout(() => {
      el.classList.remove("ring-2", "ring-kc-accent/50");
    }, 4000);
    return () => window.clearTimeout(t);
  }, [highlightPostId, items]);

  if (loading && items.length === 0) {
    return <SquareFeedSkeleton />;
  }

  if (items.length === 0 && !loading) {
    return (
      <SquareEmpty
        title="Chưa có bài viết"
        description="Hãy là người đầu tiên chia sẻ trên Square."
        action={
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Đăng nhập để đăng bài
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((post) => (
        <SquarePostCard
          key={post.id}
          post={post}
          highlighted={highlightPostId === post.id}
          onUpdated={refreshFeed}
          onDeleted={refreshFeed}
        />
      ))}

      {data?.nextCursor ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => setCursor(data.nextCursor)}
          >
            {loading ? "Đang tải…" : "Tải thêm bài viết"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
