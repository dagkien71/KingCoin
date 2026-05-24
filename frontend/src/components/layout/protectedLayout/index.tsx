import { ToastContainer } from "react-toastify";
import Header from "../header";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AccountHeader from "./account-header";

const ProtectedLayout = ({ children }: { children: ReactNode }) => {
  const location = usePathname();
  const isAccountPage = location?.startsWith("/account");
  return (
    <>
      <Header />
      <div className="mt-20">{isAccountPage && <AccountHeader />}</div>
      <main>{children}</main>
      <ToastContainer />
    </>
  );
};

export default ProtectedLayout;
