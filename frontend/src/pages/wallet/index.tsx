"use client";

import { useRouter } from "next/router";
import { useEffect } from "react";

/** Ví đã gộp vào Tổng quát — chuyển hướng cũ. */
export default function WalletRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    void router.replace("/account/dashboard");
  }, [router]);
  return (
    <p className="px-4 py-16 text-center text-sm text-kc-muted">
      Đang chuyển tới tổng quát tài sản…
    </p>
  );
}
