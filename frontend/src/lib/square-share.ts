import { squareAuthorLabel, squareProfilePath } from "@/modules/square/square-utils";
import { absoluteUrl } from "@/lib/square-og";
import type { SquarePost } from "@/types/square.type";

export function squarePostShareUrl(postId: string, appOrigin: string): string {
  return absoluteUrl(appOrigin, `/square/posts/${postId}`);
}

export function squareProfilePostUrl(
  post: SquarePost,
  appOrigin: string
): string {
  const profile = squareProfilePath(post.author);
  return absoluteUrl(appOrigin, `${profile}?post=${encodeURIComponent(post.id)}`);
}

export type SocialShareTarget = "facebook" | "twitter" | "linkedin" | "zalo";

export function buildSocialShareUrl(
  target: SocialShareTarget,
  pageUrl: string,
  text?: string
): string {
  const u = encodeURIComponent(pageUrl);
  const t = encodeURIComponent(text ?? "");
  switch (target) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "twitter":
      return `https://twitter.com/intent/tweet?url=${u}${t ? `&text=${t}` : ""}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "zalo":
      return `https://zalo.me/share?url=${u}`;
    default:
      return pageUrl;
  }
}

export function squarePostShareText(post: SquarePost): string {
  const author = squareAuthorLabel(post.author);
  const snippet = post.body?.trim().slice(0, 80);
  if (snippet) return `${author}: ${snippet}`;
  return `Xem bài viết của ${author} trên KingCoin`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function nativeSharePost(
  post: SquarePost,
  appOrigin: string
): Promise<boolean> {
  if (!canNativeShare()) return false;
  const url = squarePostShareUrl(post.id, appOrigin);
  try {
    await navigator.share({
      title: squarePostShareText(post),
      text: squarePostShareText(post),
      url,
    });
    return true;
  } catch {
    return false;
  }
}
