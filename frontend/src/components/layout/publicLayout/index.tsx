import { ToastContainer } from "react-toastify";
import Header from "../header";

import { ReactNode } from "react";

const PublicLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <Header />
      <main className="mt-20">{children}</main>
      <ToastContainer />
    </>
  );
};

export default PublicLayout;
