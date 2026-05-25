import PublicLayout from "@/components/layout/publicLayout";
import { squareCommunityOg } from "@/lib/square-og";
import type { SquareOgMeta } from "@/lib/square-og";
import { SquarePage } from "@/modules/square/SquarePage";
import type { GetStaticProps } from "next";

type PageProps = { og: SquareOgMeta };

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://king-coin-crypto-cex.vercel.app"
  );
}

export const getStaticProps: GetStaticProps<PageProps> = async () => ({
  props: { og: squareCommunityOg(siteOrigin()) },
});

export default function SquareIndexPage() {
  return (
    <PublicLayout>
      <SquarePage />
    </PublicLayout>
  );
}
