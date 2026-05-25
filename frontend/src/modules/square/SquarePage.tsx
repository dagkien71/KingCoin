"use client";

import { SquareFeed } from "@/modules/square/SquareFeed";
import { SquareCommunityLayout } from "@/modules/square/SquareCommunityLayout";
import { SquarePanel } from "@/modules/square/square-ui";
import useAuth from "@/hooks/useAuth";
import { useCallback, useRef, useState } from "react";
import { HiOutlineGlobeAlt } from "react-icons/hi";

export function SquarePage() {
  const { isLogin } = useAuth();
  const feedKey = useRef(0);
  const [feedBump, setFeedBump] = useState(0);

  const bumpFeed = useCallback(() => {
    feedKey.current += 1;
    setFeedBump(feedKey.current);
  }, []);

  return (
    <SquareCommunityLayout
      section="feed"
      showComposer={isLogin}
      onPosted={bumpFeed}
    >
      <SquarePanel noPadding className="overflow-hidden">
        <div className="border-b border-kc-border/60 bg-kc-bg/30 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <HiOutlineGlobeAlt className="h-5 w-5 text-kc-accent" aria-hidden />
            <div>
              <h2 className="text-sm font-semibold text-kc-fg">Bảng tin</h2>
              <p className="text-xs text-kc-muted">
                Bài viết mới nhất từ toàn sàn
              </p>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <SquareFeed key={feedBump} />
        </div>
      </SquarePanel>
    </SquareCommunityLayout>
  );
}
