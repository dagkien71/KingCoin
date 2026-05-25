import { getDynamicPageProps } from "@/lib/next-dynamic-slugs";
import TradeSpotPage from "@/modules/trade/TradeSpotPage";

export const getServerSideProps = getDynamicPageProps;

export default TradeSpotPage;
