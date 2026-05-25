import type { SquareAuthor } from "@/types/square.type";

export function squareAuthorLabel(author: SquareAuthor): string {
  return author.username?.trim() || `User ${author.id.slice(-6)}`;
}

export function squareProfilePath(author: SquareAuthor): string {
  const handle = author.username?.trim() || author.id;
  return `/square/u/${encodeURIComponent(handle)}`;
}

export function formatSquareRelativeTime(iso: string): string {
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
