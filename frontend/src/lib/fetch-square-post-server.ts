import type { IResponse } from "@/types/response";
import type { SquarePost } from "@/types/square.type";

function apiBase(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:3001/api/v1"
  );
}

/** SSR — lấy một bài Square (public). */
export async function fetchSquarePostServer(
  postId: string
): Promise<SquarePost | null> {
  if (!postId || postId === "undefined") return null;
  try {
    const res = await fetch(
      `${apiBase()}/square/posts/${encodeURIComponent(postId)}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as IResponse<SquarePost> | SquarePost;
    if (json && typeof json === "object" && "data" in json && json.data) {
      return json.data as SquarePost;
    }
    return json as SquarePost;
  } catch {
    return null;
  }
}
