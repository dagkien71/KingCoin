"use client";

import { Button } from "@/components/ui/button";
import { TokenIdentity } from "@/components/token/TokenLogo";
import { Card, CardContent } from "@/components/ui/card";
import { useLiveTicker } from "@/context/market-live-context";
import { applyTickerPatch } from "@/lib/apply-ticker-patch";
import useFetchApi from "@/hooks/useFetchApi";
import useMutation from "@/hooks/useMutation";
import useAuth from "@/hooks/useAuth";
import { ITokenCrypto } from "@/types/token.type";
import { QUOTE_SYMBOL } from "@/constants/quote";
import {
  feeFromNotional,
  formatFeePct,
  useTradingFees,
} from "@/hooks/useTradingFees";
import { formatTokenPrice } from "@/utils/format-number";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { FaExchangeAlt } from "react-icons/fa";
import { toast } from "react-toastify";

function useLiveToken(
  tokens: ITokenCrypto[] | null | undefined,
  tokenId: string
) {
  const patch = useLiveTicker(tokenId || null);
  return useMemo(() => {
    const base = tokens?.find((t) => t.id === tokenId);
    return base ? applyTickerPatch(base, patch) : undefined;
  }, [tokens, tokenId, patch]);
}

const Converter = () => {
  const router = useRouter();
  const { isLogin } = useAuth();
  const { data: tokens } = useFetchApi<ITokenCrypto[]>("/token-crypto/all");
  const { mutate: swap, loading } = useMutation("POST", "/convert/swap");

  const [fromTokenId, setFromTokenId] = useState("");
  const [toTokenId, setToTokenId] = useState("");
  const [amountIn, setAmountIn] = useState("");

  const fromToken = useLiveToken(tokens, fromTokenId);
  const toToken = useLiveToken(tokens, toTokenId);

  const { data: feeRates } = useTradingFees();
  const convertRate = feeRates?.convert.rate ?? 0.003;

  const amountOutEstimate = useMemo(() => {
    const amt = Number(amountIn);
    if (
      !fromToken?.price ||
      !toToken?.price ||
      !Number.isFinite(amt) ||
      amt <= 0
    ) {
      return null;
    }
    const kcValue = amt * fromToken.price;
    const feeKc = feeFromNotional(kcValue, convertRate);
    return (kcValue - feeKc) / toToken.price;
  }, [amountIn, fromToken?.price, toToken?.price, convertRate]);

  const convertFeeEstimate = useMemo(() => {
    const amt = Number(amountIn);
    if (!fromToken?.price || !Number.isFinite(amt) || amt <= 0) return null;
    return feeFromNotional(amt * fromToken.price, convertRate);
  }, [amountIn, fromToken?.price, convertRate]);

  const swapTokens = () => {
    setFromTokenId(toTokenId);
    setToTokenId(fromTokenId);
    if (amountOutEstimate != null && Number.isFinite(amountOutEstimate)) {
      const s = amountOutEstimate;
      const str =
        s >= 1 ? String(Number(s.toFixed(6))) : String(Number(s.toPrecision(6)));
      setAmountIn(str);
    }
  };

  const handleSwap = async () => {
    if (loading) return;
    if (!isLogin) {
      router.push("/login");
      return;
    }
    if (!fromTokenId || !toTokenId) {
      toast.error("Chọn token bạn gửi và token bạn nhận.");
      return;
    }
    if (fromTokenId === toTokenId) {
      toast.error("Hai token phải khác nhau.");
      return;
    }
    if (!amountIn || Number(amountIn) <= 0) {
      toast.error("Nhập số lượng hợp lệ.");
      return;
    }
    try {
      const res = (await swap({
        fromTokenId,
        toTokenId,
        amount: Number(amountIn),
      })) as { amountOut?: number; toSymbol?: string };
      const out =
        res?.amountOut != null
          ? ` Nhận ~${formatTokenPrice(toToken?.decimals ?? 6, res.amountOut)} ${res.toSymbol ?? toToken?.symbol ?? ""}.`
          : "";
      toast.success(`Chuyển đổi thành công!${out}`);
      setAmountIn("");
    } catch {
      /* handled */
    }
  };

  const tokenOptions = tokens ?? [];

  return (
    <main className="min-h-screen bg-kc-bg text-kc-fg">
      <div className="container mx-auto max-w-xl px-4 py-12">
        <h1 className="text-center text-3xl font-semibold tracking-tight">
          Chuyển đổi
        </h1>
        <p className="mt-2 text-center text-sm text-kc-muted">
          Đổi giữa hai token bất kỳ theo giá spot (quy chiếu {QUOTE_SYMBOL}).
        </p>

        <Card className="mx-auto mt-8 border-kc-border bg-kc-elevated" data-tour="convert-form">
          <CardContent className="space-y-5 pt-6">
            <div className="rounded-xl border border-kc-border bg-kc-surface/60 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">
                Bạn gửi
              </label>
              <select
                className="mb-3 w-full rounded-lg border border-kc-border bg-kc-bg px-3 py-2.5 text-sm"
                value={fromTokenId}
                onChange={(e) => setFromTokenId(e.target.value)}
              >
                <option value="">Chọn token</option>
                {tokenOptions.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.id === toTokenId}>
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
              {fromToken ? (
                <TokenIdentity
                  logo={fromToken.logo}
                  symbol={fromToken.symbol}
                  name={fromToken.name}
                  id={fromToken.id}
                  size="sm"
                  subline={`1 ${fromToken.symbol} ≈ ${formatTokenPrice(4, fromToken.price ?? 0)} ${QUOTE_SYMBOL}`}
                />
              ) : null}
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Số lượng gửi"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="num mt-3 w-full rounded-lg border border-kc-border bg-kc-bg px-4 py-3 outline-none focus:ring-1 focus:ring-kc-accent"
              />
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={swapTokens}
                disabled={!fromTokenId && !toTokenId}
                className="inline-flex rounded-full border border-kc-border bg-kc-bg p-3 text-kc-muted transition hover:border-kc-accent hover:text-kc-accent disabled:opacity-40"
                title="Hoán đổi token"
                aria-label="Hoán đổi token"
              >
                <FaExchangeAlt className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl border border-kc-border bg-kc-surface/60 p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-kc-muted">
                Bạn nhận (ước tính)
              </label>
              <select
                className="mb-3 w-full rounded-lg border border-kc-border bg-kc-bg px-3 py-2.5 text-sm"
                value={toTokenId}
                onChange={(e) => setToTokenId(e.target.value)}
              >
                <option value="">Chọn token</option>
                {tokenOptions.map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                    disabled={t.id === fromTokenId}
                  >
                    {t.symbol} — {t.name}
                  </option>
                ))}
              </select>
              {toToken ? (
                <TokenIdentity
                  logo={toToken.logo}
                  symbol={toToken.symbol}
                  name={toToken.name}
                  id={toToken.id}
                  size="sm"
                  subline={`1 ${toToken.symbol} ≈ ${formatTokenPrice(4, toToken.price ?? 0)} ${QUOTE_SYMBOL}`}
                />
              ) : null}
              <div className="num mt-3 min-h-[3rem] rounded-lg border border-dashed border-kc-border bg-kc-bg/80 px-4 py-3 text-lg font-semibold text-kc-fg">
                {amountOutEstimate != null && toToken ? (
                  <>
                    {formatTokenPrice(toToken.decimals ?? 6, amountOutEstimate)}{" "}
                    <span className="text-base font-medium text-kc-muted">
                      {toToken.symbol}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-normal text-kc-muted">
                    Nhập số lượng và chọn hai token khác nhau
                  </span>
                )}
              </div>
              {fromToken?.price && toToken?.price && amountOutEstimate != null ? (
                <p className="mt-2 space-y-0.5 text-xs text-kc-muted">
                  <span className="block">
                    Tỷ giá: 1 {fromToken.symbol} ≈{" "}
                    {(fromToken.price / toToken.price).toPrecision(4)}{" "}
                    {toToken.symbol}
                  </span>
                  {convertFeeEstimate != null && convertFeeEstimate > 0 ? (
                    <span className="block">
                      Phí chuyển đổi ({formatFeePct(convertRate)}): ~
                      {formatTokenPrice(4, convertFeeEstimate)} {QUOTE_SYMBOL}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <Button
              className="w-full"
              type="button"
              disabled={loading}
              onClick={handleSwap}
            >
              {isLogin ? "Chuyển đổi ngay" : "Đăng nhập để chuyển đổi"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Converter;
