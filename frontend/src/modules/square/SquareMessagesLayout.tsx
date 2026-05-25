"use client";

import { SquareCommunityLayout } from "@/modules/square/SquareCommunityLayout";
import { SquareInbox } from "@/modules/square/SquareInbox";
import { SquareThread } from "@/modules/square/SquareThread";

type Props = {
  conversationId?: string;
};

export function SquareMessagesLayout({ conversationId }: Props) {
  return (
    <SquareCommunityLayout section="messages" wideMain lockMainHeight>
      <div className="flex h-[min(640px,calc(100dvh-11rem))] max-h-[calc(100dvh-11rem)] flex-col overflow-hidden rounded-2xl border border-kc-border bg-kc-surface/60 shadow-kc-glow lg:flex-row">
        <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col border-r border-kc-border lg:flex xl:w-72">
          <SquareInbox activeId={conversationId} />
        </aside>
        <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-kc-bg/30">
          {conversationId ? (
            <SquareThread conversationId={conversationId} />
          ) : (
            <>
              <div className="hidden flex-1 flex-col items-center justify-center gap-2 p-8 text-center lg:flex">
                <p className="text-sm font-medium text-kc-fg">
                  Chọn cuộc trò chuyện
                </p>
                <p className="max-w-xs text-sm text-kc-muted">
                  Vào hồ sơ trader và bấm Nhắn tin để bắt đầu.
                </p>
              </div>
              <div className="flex h-full min-h-0 flex-1 flex-col lg:hidden">
                <SquareInbox activeId={conversationId} />
              </div>
            </>
          )}
        </main>
      </div>
    </SquareCommunityLayout>
  );
}
