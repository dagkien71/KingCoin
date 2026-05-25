"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useFetchApi from "@/hooks/useFetchApi";
import useLiveFetch from "@/hooks/useLiveFetch";
import useMutation, {
  isMutationFailure,
  newIdempotencyKey,
} from "@/hooks/useMutation";
import { cn } from "@/lib/cn";
import type { IBalanceSnapshot, WalletPoolId } from "@/types/trade.type";
import { useCallback, useMemo, useState } from "react";
import { HiOutlineClipboardCopy } from "react-icons/hi";
import { toast } from "react-toastify";

const WALLET_OPTIONS: { id: WalletPoolId; label: string; hint: string }[] = [
  { id: "spot", label: "Ví chính (Spot)", hint: "Giao dịch spot, swap, listing" },
  { id: "futures", label: "Ví Futures", hint: "Ký quỹ & phí futures" },
  { id: "funding", label: "Ví Funding", hint: "Phí funding futures" },
];

function poolBalance(bal: IBalanceSnapshot | undefined, pool: WalletPoolId): number {
  if (!bal) return 0;
  if (pool === "spot") return bal.spotKc ?? bal.quoteKc ?? 0;
  if (pool === "futures") return bal.futuresKc ?? 0;
  return bal.fundingKc ?? 0;
}

function WalletSelect({
  label,
  value,
  onChange,
  balances,
}: {
  label: string;
  value: WalletPoolId;
  onChange: (v: WalletPoolId) => void;
  balances?: IBalanceSnapshot;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-kc-fg">{label}</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {WALLET_OPTIONS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => onChange(w.id)}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              value === w.id
                ? "border-kc-accent bg-kc-accent/10"
                : "border-kc-border hover:border-kc-muted"
            )}
          >
            <p className="text-sm font-medium text-kc-fg">{w.label}</p>
            <p className="mt-0.5 text-xs text-kc-muted">
              {(poolBalance(balances, w.id)).toLocaleString("vi-VN")} KC
            </p>
            <p className="mt-1 text-[10px] text-kc-muted/80">{w.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AccountTransferPage() {
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

  const [tab, setTab] = useState<"external" | "internal">("external");
  const [toCode, setToCode] = useState("");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [fromWallet, setFromWallet] = useState<WalletPoolId>("spot");
  const [toWallet, setToWallet] = useState<WalletPoolId>("spot");
  const [internalFrom, setInternalFrom] = useState<WalletPoolId>("spot");
  const [internalTo, setInternalTo] = useState<WalletPoolId>("futures");

  const walletCode = overview?.walletCode ?? balances?.walletCode ?? "";

  const refreshBalances = useCallback(() => {
    void refetch();
    void refetchWallets();
  }, [refetch, refetchWallets]);

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

  const submitExternal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferOut.loading) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0.01) {
      toast.error("Số tiền tối thiểu 0.01 KC.");
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
    toast.success("Chuyển KC thành công!");
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
    const result = await transferInternal.mutate({
      fromWallet: internalFrom,
      toWallet: internalTo,
      amount: amt,
      idempotencyKey: newIdempotencyKey(),
    });
    if (isMutationFailure(result)) return;
    toast.success("Chuyển nội bộ thành công!");
    setAmount("");
    refreshBalances();
  };

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-kc-fg">Chuyển ví</h1>
      <p className="mt-1 text-sm text-kc-muted">
        Mã ví của bạn dùng để nhận KC từ người khác. Có 3 ví: Spot, Futures, Funding.
      </p>

      <Card className="mt-6 border-kc-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mã ví của bạn</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <code className="rounded-lg bg-kc-bg px-3 py-2 text-lg font-semibold tracking-wider text-kc-accent">
            {walletCode || "—"}
          </code>
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
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-2">
        {(["external", "internal"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium",
              tab === t
                ? "bg-kc-accent/20 text-kc-accent"
                : "text-kc-muted hover:text-kc-fg"
            )}
          >
            {t === "external" ? "Chuyển cho người khác" : "Chuyển giữa ví của tôi"}
          </button>
        ))}
      </div>

      <Card className="mt-4 border-kc-border">
        <CardContent className="pt-6">
          {tab === "external" ? (
            <form onSubmit={submitExternal} className="space-y-5">
              <WalletSelect
                label="Ví nguồn"
                value={fromWallet}
                onChange={setFromWallet}
                balances={mergedBalances}
              />
              <WalletSelect
                label="Ví đích (người nhận)"
                value={toWallet}
                onChange={setToWallet}
                balances={undefined}
              />
              <div>
                <label className="mb-1.5 block text-sm text-kc-muted">
                  Mã ví người nhận
                </label>
                <div className="flex gap-2">
                  <Input
                    value={toCode}
                    onChange={(e) =>
                      setToCode(e.target.value.toUpperCase().replace(/\s/g, ""))
                    }
                    placeholder="KC-XXXXXXXX"
                    onBlur={() => void lookupRecipient()}
                  />
                  <Button type="button" variant="secondary" onClick={lookupRecipient}>
                    Kiểm tra
                  </Button>
                </div>
                {recipientName ? (
                  <p className="mt-1 text-xs text-kc-up">
                    Người nhận: {recipientName}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-kc-muted">
                  Số KC
                </label>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                size="lg"
                disabled={transferOut.loading}
              >
                {transferOut.loading ? "Đang chuyển…" : "Chuyển KC"}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitInternal} className="space-y-5">
              <WalletSelect
                label="Từ ví"
                value={internalFrom}
                onChange={setInternalFrom}
                balances={mergedBalances}
              />
              <WalletSelect
                label="Sang ví"
                value={internalTo}
                onChange={setInternalTo}
                balances={mergedBalances}
              />
              <div>
                <label className="mb-1.5 block text-sm text-kc-muted">
                  Số KC
                </label>
                <Input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <p className="text-xs text-kc-muted">
                Trước khi mở lệnh Futures, chuyển KC từ ví chính sang ví Futures.
              </p>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                size="lg"
                disabled={transferInternal.loading}
              >
                {transferInternal.loading ? "Đang chuyển…" : "Chuyển nội bộ"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
