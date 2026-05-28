"use client";

import useFetchApi from "@/hooks/useFetchApi";
import type {
  LiquidityBotRole,
  LiquidityOrdersMonitor,
} from "@/modules/admin/liquidity-orders/liquidity-orders-types";
import { useMemo, useState } from "react";

export function useLiquidityOrders() {
  const [tokenId, setTokenId] = useState<string>("");
  const [role, setRole] = useState<LiquidityBotRole | "">("");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (tokenId) p.set("tokenId", tokenId);
    if (role) p.set("role", role);
    p.set("pendingLimit", "300");
    p.set("fillsLimit", "150");
    const qs = p.toString();
    return qs ? `/admin/liquidity-orders?${qs}` : "/admin/liquidity-orders";
  }, [tokenId, role]);

  const { data, loading, error, refetch } = useFetchApi<LiquidityOrdersMonitor>(
    query,
    { refreshInterval: 3000 },
  );

  return {
    data,
    loading,
    error,
    refetch,
    tokenId,
    setTokenId,
    role,
    setRole,
  };
}
