import Head from "next/head";
import type { SquareOgMeta } from "@/lib/square-og";

type Props = SquareOgMeta & {
  /** Thêm noindex cho trang nội bộ (tuỳ chọn) */
  noIndex?: boolean;
};

export function SeoHead({
  title,
  description,
  image,
  url,
  type = "website",
  siteName = "KingCoin",
  noIndex,
}: Props) {
  const safeTitle = title.trim() || "KingCoin";
  const safeDesc = description.trim() || "KingCoin — sàn giao dịch mô phỏng";

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
      <meta property="og:locale" content="vi_VN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDesc} />
      <meta name="twitter:image" content={image} />
    </Head>
  );
}
