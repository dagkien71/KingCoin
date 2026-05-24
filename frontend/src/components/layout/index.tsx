"use client";

import AppShell from "./app-shell";
import AdminShell from "./admin/AdminShell";
import IssuerShell from "./issuer/IssuerShell";
import { ReactNode } from "react";
import { useRouter } from "next/router";
import { ToastContainer } from "react-toastify";

const toastProps = {
  position: "top-right" as const,
  theme: "dark" as const,
  autoClose: 3200,
  hideProgressBar: false,
  closeOnClick: true,
  className: "!top-20",
};

/** Shell thống nhất: header, account sub-nav khi cần, toast */
const Layout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const isIssuerMode = router.pathname.startsWith("/issuer");
  const isAdminMode = router.pathname.startsWith("/admin");

  if (isAdminMode) {
    return (
      <>
        <AdminShell>{children}</AdminShell>
        <ToastContainer {...toastProps} />
      </>
    );
  }

  if (isIssuerMode) {
    return (
      <>
        <IssuerShell>{children}</IssuerShell>
        <ToastContainer {...toastProps} />
      </>
    );
  }

  return <AppShell>{children}</AppShell>;
};

export default Layout;
