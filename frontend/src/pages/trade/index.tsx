import { quotePairLabel } from "@/constants/quote";
import { DEFAULT_TRADE_TOKEN_SLUG } from "@/constants/trade";
import { defaultTradeHref } from "@/lib/token-routes";
import { useRouter } from "next/router";
import { useEffect } from "react";

/**
 * /trade — không có cặp cụ thể: chuyển tới đồng chủ đạo KingCoin.
 */
export default function TradeDefaultRedirect() {
  const router = useRouter();

  useEffect(() => {
    void router.replace(defaultTradeHref());
  }, [router]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-kc-bg px-4 text-sm text-kc-muted">
      Đang mở {quotePairLabel(DEFAULT_TRADE_TOKEN_SLUG)}…
    </div>
  );
}
