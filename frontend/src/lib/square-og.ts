import { squareAuthorLabel } from "@/modules/square/square-utils";
import type { SquarePost } from "@/types/square.type";

export type SquareOgMeta = {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
  siteName?: string;
};

const DEFAULT_OG_IMAGE = "/og-default.svg";
const SITE_NAME = "KingCoin";

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function postSummary(post: SquarePost): string {
  if (post.body?.trim()) return post.body.trim();
  if (post.kind === "order_spot" && post.embed) {
    return `Lệnh spot ${String(post.embed.type ?? "").toUpperCase()} ${post.embed.symbol ?? ""}`;
  }
  if (post.kind === "order_futures" && post.embed) {
    return `Vị thế ${String(post.embed.side ?? "").toUpperCase()} ${post.embed.symbol ?? ""}`;
  }
  if (post.poll) return "Bình chọn trên Cộng đồng KingCoin";
  if (post.imageUrls?.length) return "Bài viết có ảnh trên Cộng đồng KingCoin";
  return "Bài viết trên Cộng đồng KingCoin";
}

export function absoluteUrl(appOrigin: string, path: string): string {
  const base = appOrigin.replace(/\/$/, "");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildSquarePostOg(
  post: SquarePost,
  appOrigin: string
): SquareOgMeta {
  const author = squareAuthorLabel(post.author);
  const summary = postSummary(post);
  const postUrl = absoluteUrl(appOrigin, `/square/posts/${post.id}`);
  const image =
    post.imageUrls?.[0]?.trim() ||
    absoluteUrl(appOrigin, DEFAULT_OG_IMAGE);

  return {
    title: `${author} trên KingCoin Cộng đồng`,
    description: truncate(summary, 200),
    image,
    url: postUrl,
    type: "article",
    siteName: SITE_NAME,
  };
}

export function defaultSiteOg(appOrigin: string): SquareOgMeta {
  return {
    title: "KingCoin — Sàn mô phỏng Spot & Futures",
    description:
      "Tạo token, trade như sàn thật, kiếm KC miễn phí. Cộng đồng chia sẻ lệnh và nhận định.",
    image: absoluteUrl(appOrigin, DEFAULT_OG_IMAGE),
    url: absoluteUrl(appOrigin, "/"),
    type: "website",
    siteName: SITE_NAME,
  };
}

export function squareCommunityOg(appOrigin: string): SquareOgMeta {
  return {
    title: "Cộng đồng KingCoin",
    description:
      "Bảng tin trader: đăng bài, bình luận, chia sẻ lệnh Spot/Futures kèm PnL/ROI.",
    image: absoluteUrl(appOrigin, DEFAULT_OG_IMAGE),
    url: absoluteUrl(appOrigin, "/square"),
    type: "website",
    siteName: SITE_NAME,
  };
}
