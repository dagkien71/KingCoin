"use client";

import { useRouter } from "next/router";
import { useEffect } from "react";

export default function TradeHistoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    void router.replace("/account/history");
  }, [router]);
  return null;
}
