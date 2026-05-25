import Layout from "@/components/layout";
import { MarketLiveProvider } from "@/context/market-live-context";
import { NotificationProvider } from "@/context/notification-context";
import { TourProvider } from "@/modules/onboarding/TourProvider";
import StoreProvider from "@/store/storeProvider";
import "@/styles/globals.css";
import "@/modules/onboarding/tour-theme.css";
import { SeoHead } from "@/components/seo/SeoHead";
import { APP_URL } from "@/constant/config";
import { defaultSiteOg } from "@/lib/square-og";
import type { AppProps } from "next/app";
import { Geist, Geist_Mono } from "next/font/google";
import "driver.js/dist/driver.css";
import "react-toastify/dist/ReactToastify.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const defaultOg = defaultSiteOg(
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://king-coin-crypto-cex.vercel.app"
);

export default function App({ Component, pageProps }: AppProps) {
  const pageOg = (pageProps as { og?: typeof defaultOg }).og;
  return (
    <>
      <SeoHead {...(pageOg ?? defaultOg)} />
      <div
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-screen`}
      >
        <StoreProvider>
          <MarketLiveProvider>
            <NotificationProvider>
              <TourProvider>
                <Layout>
                  <Component {...pageProps} />
                </Layout>
              </TourProvider>
            </NotificationProvider>
          </MarketLiveProvider>
        </StoreProvider>
      </div>
    </>
  );
}
