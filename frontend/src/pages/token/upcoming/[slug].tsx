import { getDynamicPageProps } from "@/lib/next-dynamic-slugs";
import { UpcomingListingDetailView } from "@/modules/token/upcoming/UpcomingListingDetailView";

export const getServerSideProps = getDynamicPageProps;

export default function UpcomingTokenDetailPage() {
  return <UpcomingListingDetailView />;
}
