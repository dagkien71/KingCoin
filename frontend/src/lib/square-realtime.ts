import { getMarketSocket } from "@/lib/market-realtime-socket";
import { getUserSocket } from "@/lib/user-realtime-socket";

const SQUARE_FEED = "square:feed";

let feedSubscribers = 0;

export function subscribeSquareFeed(): void {
  feedSubscribers += 1;
  if (feedSubscribers > 1) return;
  const s = getMarketSocket();
  if (!s.connected) s.connect();
  s.emit("subscribe", { channel: SQUARE_FEED });
}

export function unsubscribeSquareFeed(): void {
  feedSubscribers = Math.max(0, feedSubscribers - 1);
  if (feedSubscribers > 0) return;
  getMarketSocket().emit("unsubscribe", { channel: SQUARE_FEED });
}

export function onSquareFeedEvent(
  handler: (event: string, payload: unknown) => void
): () => void {
  const s = getMarketSocket();
  const events = [
    "square:post_created",
    "square:post_deleted",
    "square:reaction_updated",
    "square:poll_updated",
    "square:comment_created",
    "square:comment_deleted",
  ] as const;
  for (const ev of events) {
    s.on(ev, (payload: unknown) => handler(ev, payload));
  }
  return () => {
    for (const ev of events) {
      s.off(ev);
    }
  };
}

export function subscribeSquareConv(conversationId: string): void {
  const socket = getUserSocket() ?? getMarketSocket();
  if (!socket.connected) socket.connect();
  socket.emit("subscribe", { channel: `square:conv:${conversationId}` });
}

export function unsubscribeSquareConv(conversationId: string): void {
  const socket = getUserSocket() ?? getMarketSocket();
  socket.emit("unsubscribe", { channel: `square:conv:${conversationId}` });
}

export function onSquareMessage(
  handler: (payload: unknown) => void
): () => void {
  const attach = (socket: ReturnType<typeof getUserSocket>) => {
    if (!socket) return () => undefined;
    socket.on("square:message", handler);
    return () => socket.off("square:message", handler);
  };
  let cleanup = attach(getUserSocket());
  const interval = setInterval(() => {
    const s = getUserSocket();
    if (s && cleanup) {
      cleanup();
      cleanup = attach(s);
    }
  }, 2000);
  return () => {
    clearInterval(interval);
    cleanup?.();
  };
}
