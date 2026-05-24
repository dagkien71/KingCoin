import { API_ORIGIN, WS_NAMESPACE } from "@/constant/config";
import { io, type Socket } from "socket.io-client";

let userSocket: Socket | null = null;

/** Socket có JWT — nhận thông báo user-scoped (auto-join user:{id}). */
export function connectUserSocket(accessToken: string): Socket {
  if (userSocket?.connected) {
    userSocket.auth = { token: accessToken };
    return userSocket;
  }
  if (userSocket) {
    userSocket.disconnect();
    userSocket = null;
  }
  userSocket = io(`${API_ORIGIN}${WS_NAMESPACE}`, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    auth: { token: accessToken },
  });
  return userSocket;
}

export function disconnectUserSocket(): void {
  userSocket?.disconnect();
  userSocket = null;
}

export function getUserSocket(): Socket | null {
  return userSocket;
}
