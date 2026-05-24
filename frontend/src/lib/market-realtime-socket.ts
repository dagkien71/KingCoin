import { API_ORIGIN, WS_NAMESPACE } from "@/constant/config";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
const channelRefCount = new Map<string, number>();

export function getMarketSocket(): Socket {
  if (typeof window === "undefined") {
    throw new Error("Socket chỉ dùng phía client");
  }
  if (!socket) {
    socket = io(`${API_ORIGIN}${WS_NAMESPACE}`, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function subscribeChannel(channel: string): void {
  const prev = channelRefCount.get(channel) ?? 0;
  channelRefCount.set(channel, prev + 1);
  if (prev > 0) return;

  const s = getMarketSocket();
  if (!s.connected) {
    s.connect();
  }
  s.emit("subscribe", { channel });
}

export function unsubscribeChannel(channel: string): void {
  const prev = channelRefCount.get(channel) ?? 0;
  if (prev <= 0) return;
  if (prev > 1) {
    channelRefCount.set(channel, prev - 1);
    return;
  }
  channelRefCount.delete(channel);
  socket?.emit("unsubscribe", { channel });
}
