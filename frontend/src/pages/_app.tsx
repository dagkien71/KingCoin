import Layout from "@/components/layout";
import { MarketLiveProvider } from "@/context/market-live-context";
import { NotificationProvider } from "@/context/notification-context";
import { TourProvider } from "@/modules/onboarding/TourProvider";
import StoreProvider from "@/store/storeProvider";
import "@/styles/globals.css";
import "@/modules/onboarding/tour-theme.css";
import type { AppProps } from "next/app";
import Head from "next/head";
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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>KingCoin</title>
        <meta
          name="description"
          content="KingCoin — giao dịch spot, futures và phát hành token trên KC."
        />
      </Head>
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
