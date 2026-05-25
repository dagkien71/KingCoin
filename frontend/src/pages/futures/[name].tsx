import { getDynamicPageProps } from "@/lib/next-dynamic-slugs";
import FuturesTerminal from "@/modules/futures/FuturesTerminal";

export const getServerSideProps = getDynamicPageProps;

export default FuturesTerminal;
