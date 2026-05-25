import PublicLayout from "@/components/layout/publicLayout";
import { fetchSquarePostServer } from "@/lib/fetch-square-post-server";
import { buildSquarePostOg } from "@/lib/square-og";
import { SquarePostDetailView } from "@/modules/square/SquarePostDetailView";
import type { SquareOgMeta } from "@/lib/square-og";
import type { SquarePost } from "@/types/square.type";
import type { GetServerSideProps } from "next";

type PageProps = {
  post: SquarePost;
  og: SquareOgMeta;
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (
  ctx
) => {
  const id = typeof ctx.params?.id === "string" ? ctx.params.id : "";
  const post = await fetchSquarePostServer(id);
  if (!post?.id) {
    return { notFound: true };
  }

  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (ctx.req.headers.host
      ? `${ctx.req.headers["x-forwarded-proto"] === "https" ? "https" : "http"}://${ctx.req.headers.host}`
      : "https://king-coin-crypto-cex.vercel.app");

  const og = buildSquarePostOg(post, appOrigin);
  return { props: { post, og } };
};

export default function SquarePostPage({ post }: PageProps) {
  return (
    <PublicLayout>
      <SquarePostDetailView post={post} />
    </PublicLayout>
  );
}
