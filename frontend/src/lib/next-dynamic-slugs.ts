import type { GetServerSideProps } from "next";

/**
 * Pages Router + Vercel: route động (/trade/CR7, /futures/…, /token/…) cần SSR hook,
 * nếu không build coi là static-only → 404 mọi slug trên production.
 */
export const getDynamicPageProps: GetServerSideProps = async () => ({
  props: {},
});
