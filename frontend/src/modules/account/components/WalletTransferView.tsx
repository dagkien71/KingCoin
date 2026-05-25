"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QUOTE_SYMBOL } from "@/constants/quote";
import useFetchApi from "@/hooks/useFetchApi";
import useLiveFetch from "@/hooks/useLiveFetch";
import useMutation, {
  isMutationFailure,
  newIdempotencyKey,
} from "@/hooks/useMutation";
import { cn } from "@/lib/cn";
import { poolAvailableKc } from "@/lib/wallet-pools";
import type { IBalanceSnapshot, WalletPoolId } from "@/types/trade.type";
import { formatTokenPrice } from "@/utils/format-number";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  HiOutlineArrowRight,
  HiOutlineClipboardCopy,
  HiOutlineSwitchVertical,
} from "react-icons/hi";
import { toast } from "react-toastify";

const WALLET_META: Record<
  WalletPoolId,
  { label: string; short: string; hint: string }
> = {
  spot: {
    label: "Ví Spot",
    short: "Spot",
    hint: "Giao dịch spot, swap, niêm yết",
  },
  futures: {
    label: "Ví Futures",
    short: "Futures",
    hint: "Ký quỹ & phí hợp đồng",
  },
  funding: {
    label: "Ví Funding",
    short: "Funding",
    hint: "Phí funding futures",
  },
};

const WALLET_ORDER: WalletPoolId[] = ["spot", "futures", "funding"];

const selectClass =
  "h-10 min-w-[140px] rounded-lg border border-kc-border bg-kc-bg px-3 text-sm font-medium text-kc-fg focus:border-kc-accent focus:outline-none focus:ring-2 focus:ring-kc-accent/30";

function WalletTransferRow({
  label,
  wallet,
  onWalletChange,
  available,
  disabled,
}: {
  label: string;
  wallet: WalletPoolId;
  onWalletChange: (w: WalletPoolId) => void;
  available?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-kc-muted">
          {label}
        </p>
        {available != null ? (
          <p className="mt-1 text-xs text-kc-muted">
            Khả dụng{" "}
            <span className="font-medium text-kc-fg">
              {formatTokenPrice(2, available)} {QUOTE_SYMBOL}
            </span>
          </p>
        ) : null}
      </div>
      <select
        className={selectClass}
        value={wallet}
        disabled={disabled}
        onChange={(e) => onWalletChange(e.target.value as WalletPoolId)}
        aria-label={label}
      >
        {WALLET_ORDER.map((id) => (
          <option key={id} value={id}>
            {WALLET_META[id].label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AmountBlock({
  amount,
  onAmountChange,
  available,
  onMax,
  loading,
}: {
  amount: string;
  onAmountChange: (v: string) => void;
  available: number;
  onMax: () => void;
  loading?: boolean;
}) {
  return (
    <div className="space-y-2 px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-kc-fg">Số lượng</span>
        <button
          type="button"
          className="text-xs font-medium text-kc-accent hover:underline"
          onClick={onMax}
          disabled={loading || available <= 0}
        >
          Tối đa
        </button>
      </div>
      <div className="flex overflow-hidden rounded-xl border border-kc-border bg-kc-bg focus-within:border-kc-accent focus-within:ring-2 focus-within:ring-kc-accent/25">
        <Input
          type="number"
          min={0.01}
          step="any"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="0.00"
          className="h-12 flex-1 border-0 bg-transparent focus-visible:ring-0"
          disabled={loading}
        />
        <div className="flex items-center border-l border-kc-border px-4 text-sm font-semibold text-kc-fg">
          {QUOTE_SYMBOL}
        </div>
      </div>
      <p className="text-xs text-kc-muted">
        Khả dụng: {formatTokenPrice(2, available)} {QUOTE_SYMBOL}
      </p>
    </div>
  );
}

export function WalletTransferView() {
  const { data: balances, refetch } = useLiveFetch<IBalanceSnapshot>(
    "/users/me/balances",
    { stream: "trades" }
  );
  const { data: overview, refetch: refetchWallets } = useFetchApi<{
    walletCode: string;
    spotKc: number;
    futuresKc: number;
    fundingKc: number;
  }>("/wallets/me");

  const transferOut = useMutation("POST", "/wallets/transfer");
  const transferInternal = useMutation("POST", "/wallets/transfer-internal");

  const [mode, setMode] = useState<"internal" | "external">("internal");
  const [toCode, setToCode] = useState("");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [fromWallet, setFromWallet] = useState<WalletPoolId>("spot");
  const [toWallet, setToWallet] = useState<WalletPoolId>("spot");
  const [internalFrom, setInternalFrom] = useState<WalletPoolId>("spot");
  const [internalTo, setInternalTo] = useState<WalletPoolId>("futures");

  const walletCode = overview?.walletCode ?? balances?.walletCode ?? "";

  const mergedBalances = useMemo(
    (): IBalanceSnapshot | undefined =>
      balances
        ? {
            ...balances,
            spotKc: overview?.spotKc ?? balances.spotKc ?? balances.quoteKc,
            futuresKc: overview?.futuresKc ?? balances.futuresKc,
            fundingKc: overview?.fundingKc ?? balances.fundingKc,
            walletCode: walletCode || balances.walletCode,
          }
        : undefined,
    [balances, overview, walletCode]
  );

  const refreshBalances = useCallback(() => {
    void refetch();
    void refetchWallets();
  }, [refetch, refetchWallets]);

  const totalKc = useMemo(() => {
    if (!mergedBalances) return 0;
    return (
      poolAvailableKc(mergedBalances, "spot") +
      poolAvailableKc(mergedBalances, "futures") +
      poolAvailableKc(mergedBalances, "funding")
    );
  }, [mergedBalances]);

  const internalAvailable = poolAvailableKc(mergedBalances, internalFrom);
  const externalAvailable = poolAvailableKc(mergedBalances, fromWallet);

  const swapInternalWallets = () => {
    setInternalFrom(internalTo);
    setInternalTo(internalFrom);
  };

  const applyMax = (available: number) => {
    const v = Math.max(0, available);
    setAmount(v >= 1 ? String(Number(v.toFixed(4))) : String(v));
  };

  const lookupRecipient = async () => {
    const code = toCode.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/wallets/lookup?code=${encodeURIComponent(code)}`
      );
      const json = await res.json();
      const data = json?.data ?? json;
      if (data?.walletCode) {
        setRecipientName(data.username ?? data.walletCode);
      } else {
        setRecipientName(null);
        toast.error("Không tìm thấy mã ví.");
      }
    } catch {
      toast.error("Không tra cứu được mã ví.");
    }
  };

  const pasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setToCode(text.trim().toUpperCase().replace(/\s/g, ""));
      void lookupRecipient();
    } catch {
      toast.info("Không đọc được clipboard.");
    }
  };

  const submitExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferOut.loading) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0.01) {
      toast.error("Số tiền tối thiểu 0.01 KC.");
      return;
    }
    if (amt > externalAvailable + 1e-9) {
      toast.error("Số dư ví nguồn không đủ.");
      return;
    }
    const result = await transferOut.mutate({
      toWalletCode: toCode.trim().toUpperCase(),
      amount: amt,
      fromWallet,
      toWallet,
      idempotencyKey: newIdempotencyKey(),
    });
    if (isMutationFailure(result)) return;
    toast.success("Đã gửi KC thành công.");
    setAmount("");
    refreshBalances();
  };

  const submitInternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferInternal.loading) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0.01) {
      toast.error("Số tiền tối thiểu 0.01 KC.");
      return;
    }
    if (internalFrom === internalTo) {
      toast.error("Chọn hai ví khác nhau.");
      return;
    }
    if (amt > internalAvailable + 1e-9) {
      toast.error("Số dư ví nguồn không đủ.");
      return;
    }
    const result = await transferInternal.mutate({
      fromWallet: internalFrom,
      toWallet: internalTo,
      amount: amt,
      idempotencyKey: newIdempotencyKey(),
    });
    if (isMutationFailure(result)) return;
    toast.success("Chuyển giữa các ví thành công.");
    setAmount("");
    refreshBalances();
  };

  const busy = transferOut.loading || transferInternal.loading;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-kc-fg">
            Chuyển {QUOTE_SYMBOL}
          </h1>
          <p className="mt-1 text-sm text-kc-muted">
            Chuyển giữa Spot, Futures, Funding hoặc gửi cho người dùng khác.
          </p>
        </div>
        <Link
          href="/account/dashboard"
          className="text-sm font-medium text-kc-accent hover:underline"
        >
          Tổng quát tài sản →
        </Link>
      </div>

      {/* Tổng quan ví — kiểu Binance/OKX */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {WALLET_ORDER.map((id) => {
          const bal = poolAvailableKc(mergedBalances, id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (mode === "internal") {
                  setInternalFrom(id);
                } else {
                  setFromWallet(id);
                }
              }}
              className="rounded-xl border border-kc-border bg-kc-elevated/80 p-4 text-left transition hover:border-kc-accent/40 hover:bg-kc-surface/50"
            >
              <p className="text-xs font-medium text-kc-muted">
                {WALLET_META[id].short}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-kc-fg">
                {formatTokenPrice(2, bal)}
              </p>
              <p className="text-[10px] text-kc-muted">{QUOTE_SYMBOL}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-right text-xs text-kc-muted">
        Tổng ước tính:{" "}
        <span className="font-medium text-kc-fg">
          {formatTokenPrice(2, totalKc)} {QUOTE_SYMBOL}
        </span>
      </p>

      {/* Mã ví nhận */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kc-border/80 bg-kc-surface/40 px-4 py-3">
        <div>
          <p className="text-xs text-kc-muted">Mã ví của bạn (nhận KC)</p>
          <code className="mt-0.5 text-base font-semibold tracking-wider text-kc-accent">
            {walletCode || "—"}
          </code>
        </div>
        {walletCode ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(walletCode);
              toast.success("Đã copy mã ví");
            }}
          >
            <HiOutlineClipboardCopy className="h-4 w-4" />
            Copy
          </Button>
        ) : null}
      </div>

      {/* Tab chế độ */}
      <div
        className="mt-6 flex rounded-xl border border-kc-border bg-kc-elevated p-1"
        role="tablist"
      >
        {(
          [
            { id: "internal" as const, label: "Giữa các ví" },
            { id: "external" as const, label: "Gửi cho người khác" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={mode === t.id ? "true" : "false"}
            onClick={() => {
              setMode(t.id);
              setAmount("");
              setRecipientName(null);
            }}
            className={cn(
              "flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors",
              mode === t.id
                ? "bg-kc-accent text-white shadow-sm"
                : "text-kc-muted hover:text-kc-fg"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Form chính */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-kc-border bg-kc-elevated/60 shadow-sm">
        {mode === "internal" ? (
          <form onSubmit={submitInternal}>
            <div className="divide-y divide-kc-border/80">
              <WalletTransferRow
                label="Từ"
                wallet={internalFrom}
                onWalletChange={setInternalFrom}
                available={internalAvailable}
                disabled={busy}
              />
            </div>

            <div className="relative flex justify-center py-1">
              <div className="absolute inset-x-0 top-1/2 h-px bg-kc-border/80" />
              <button
                type="button"
                onClick={swapInternalWallets}
                disabled={busy}
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-kc-border bg-kc-bg text-kc-accent shadow transition hover:border-kc-accent hover:bg-kc-accent/10 disabled:opacity-50"
                title="Đổi ví nguồn và đích"
                aria-label="Đổi ví"
              >
                <HiOutlineSwitchVertical className="h-5 w-5" />
              </button>
            </div>

            <div className="divide-y divide-kc-border/80">
              <WalletTransferRow
                label="Đến"
                wallet={internalTo}
                onWalletChange={setInternalTo}
                disabled={busy}
              />
            </div>

            <AmountBlock
              amount={amount}
              onAmountChange={setAmount}
              available={internalAvailable}
              onMax={() => applyMax(internalAvailable)}
              loading={busy}
            />

            <div className="border-t border-kc-border/80 px-4 py-4 sm:px-5">
              <p className="mb-3 text-xs text-kc-muted">
                Gợi ý: trước khi mở lệnh Futures, chuyển KC từ Spot sang Futures.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-kc-border px-3 py-1.5 text-xs text-kc-muted hover:border-kc-accent/40 hover:text-kc-fg"
                  onClick={() => {
                    setInternalFrom("spot");
                    setInternalTo("futures");
                  }}
                >
                  Spot → Futures
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-kc-border px-3 py-1.5 text-xs text-kc-muted hover:border-kc-accent/40 hover:text-kc-fg"
                  onClick={() => {
                    setInternalFrom("futures");
                    setInternalTo("spot");
                  }}
                >
                  Futures → Spot
                </button>
              </div>
              <Button
                type="submit"
                variant="primary"
                className="mt-4 w-full"
                size="lg"
                disabled={busy || internalFrom === internalTo}
              >
                {transferInternal.loading ? "Đang chuyển…" : "Xác nhận chuyển"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={submitExternal}>
            <div className="divide-y divide-kc-border/80">
              <WalletTransferRow
                label="Ví gửi"
                wallet={fromWallet}
                onWalletChange={setFromWallet}
                available={externalAvailable}
                disabled={busy}
              />
            </div>

            <div className="space-y-3 border-t border-kc-border/80 px-4 py-4 sm:px-5">
              <p className="text-xs font-medium uppercase tracking-wide text-kc-muted">
                Người nhận
              </p>
              <div className="flex gap-2">
                <Input
                  value={toCode}
                  onChange={(e) => {
                    setToCode(e.target.value.toUpperCase().replace(/\s/g, ""));
                    setRecipientName(null);
                  }}
                  placeholder="Mã ví KC-…"
                  className="h-11 font-mono tracking-wide"
                  onBlur={() => void lookupRecipient()}
                  disabled={busy}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void pasteCode()}
                  disabled={busy}
                >
                  Dán
                </Button>
              </div>
              {recipientName ? (
                <p className="flex items-center gap-1 text-sm text-kc-up">
                  <HiOutlineArrowRight className="h-4 w-4 shrink-0" />
                  {recipientName}
                </p>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-kc-accent"
                  onClick={() => void lookupRecipient()}
                >
                  Kiểm tra mã ví
                </Button>
              )}
            </div>

            <div className="border-t border-kc-border/80 px-4 py-3 sm:px-5">
              <p className="mb-2 text-xs text-kc-muted">
                Ví nhận trên tài khoản đối phương
              </p>
              <select
                className={cn(selectClass, "w-full sm:w-auto")}
                value={toWallet}
                disabled={busy}
                aria-label="Ví nhận trên tài khoản đối phương"
                onChange={(e) => setToWallet(e.target.value as WalletPoolId)}
              >
                {WALLET_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {WALLET_META[id].label}
                  </option>
                ))}
              </select>
            </div>

            <AmountBlock
              amount={amount}
              onAmountChange={setAmount}
              available={externalAvailable}
              onMax={() => applyMax(externalAvailable)}
              loading={busy}
            />

            <div className="border-t border-kc-border/80 px-4 py-4 sm:px-5">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                size="lg"
                disabled={busy || !toCode.trim()}
              >
                {transferOut.loading ? "Đang gửi…" : "Gửi KC"}
              </Button>
              <p className="mt-3 text-center text-[11px] text-kc-muted">
                Miễn phí nội bộ sàn · Kiểm tra mã ví trước khi gửi
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
