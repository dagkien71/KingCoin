import { ToastContainer } from "react-toastify";
import { ReactNode } from "react";
import { useAppSelector } from "@/store/hook";
import { RootState } from "@/store/store";
import Header from "./header";
import SiteFooter from "./site-footer";
import AccountHeader from "./protectedLayout/account-header";
import { useRouter } from "next/router";
import { cn } from "@/lib/cn";

export default function AppShell({ children }: { children: ReactNode }) {
  const { isLogin } = useAppSelector((s: RootState) => s.auth);
  const router = useRouter();
  const showAccountNav = isLogin && router.pathname.startsWith("/account");

  return (
    <>
      <Header />
      {showAccountNav && <AccountHeader />}
      <main
        className={cn(
          "min-h-screen",
          showAccountNav ? "pt-28" : "pt-16"
        )}
      >
        {children}
      </main>
      <SiteFooter />
      <ToastContainer
        position="top-right"
        theme="dark"
        autoClose={3200}
        hideProgressBar={false}
        closeOnClick
        className="!top-20"
      />
    </>
  );
}
