"use client";

import { useLiveTicker } from "@/context/market-live-context";
import { applyTickerPatch } from "@/lib/apply-ticker-patch";
import type { ITokenCrypto } from "@/types/token.type";
import { useMemo } from "react";

/** Token + patch hiển thị (đã throttle) + flash hướng giá */
export function useLiveTokenDisplay<
  T extends { id?: string | null } & Partial<ITokenCrypto>,
>(token: T) {
  const patch = useLiveTicker(token.id ?? null);
  const live = useMemo(
    () => (token.id ? applyTickerPatch(token, patch) ?? token : token),
    [token, patch]
  );
  return {
    live,
    patch,
    flash: patch?.flash ?? null,
  };
}
