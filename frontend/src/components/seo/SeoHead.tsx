import Head from "next/head";
import {
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
} from "@/lib/square-og";
import type { SquareOgMeta } from "@/lib/square-og";

type Props = SquareOgMeta & {
  /** Thêm noindex cho trang nội bộ (tuỳ chọn) */
  noIndex?: boolean;
  imageWidth?: number;
  imageHeight?: number;
};

export function SeoHead({
  title,
  description,
  image,
  url,
  type = "website",
  siteName = "KingCoin",
  noIndex,
  imageWidth = DEFAULT_OG_IMAGE_WIDTH,
  imageHeight = DEFAULT_OG_IMAGE_HEIGHT,
}: Props) {
  const safeTitle = title.trim() || "KingCoin";
  const safeDesc = description.trim() || "KingCoin — sàn giao dịch mô phỏng";
  const isDefaultOgAsset =
    image.includes("/og-site.jpg") || image.endsWith("og-site.jpg");

  return (
    <Head>
      <title>{safeTitle}</title>
      <meta name="description" content={safeDesc} />
      {noIndex ? <meta name="robots" content="noindex,nofollow" /> : null}

      <link rel="canonical" href={url} />

      <meta property="og:site_name" content={siteName} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:secure_url" content={image} />
      {isDefaultOgAsset ? (
        <>
          <meta property="og:image:type" content="image/jpeg" />
          <meta
            property="og:image:width"
            content={String(imageWidth)}
          />
          <meta
            property="og:image:height"
            content={String(imageHeight)}
          />
          <meta property="og:image:alt" content={safeTitle} />
        </>
      ) : null}
      <meta property="og:locale" content="vi_VN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDesc} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
