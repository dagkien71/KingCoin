"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenIdentity } from "@/components/token/TokenLogo";
import useFetchApi from "@/hooks/useFetchApi";
import { ITokenCrypto } from "@/types/token.type";
import { useMemo } from "react";
import { ledgerEntryLabel } from "@/lib/ledger-labels";
import type { IBalanceSnapshot, ILedgerEntry } from "@/types/trade.type";
import { formatTokenPrice } from "@/utils/format-number";
import { QUOTE_SYMBOL } from "@/constants/quote";
import Link from "next/link";

type LedgerPage = {
  data: ILedgerEntry[];
  meta?: { total?: number };
};

export default function WalletPage() {
  const { data: balances } = useFetchApi<IBalanceSnapshot>("/users/me/balances");
  const { data: allTokens } = useFetchApi<ITokenCrypto[]>("/token-crypto/all");
  const { data: ledgerPage, loading } = useFetchApi<LedgerPage>("/users/me/ledger");

  const tokenMeta = useMemo(() => {
    const m = new Map<string, ITokenCrypto>();
    for (const t of allTokens ?? []) {
      m.set(t.id, t);
    }
    return m;
  }, [allTokens]);

  const entries = ledgerPage?.data ?? (Array.isArray(ledgerPage) ? ledgerPage : []);

  return (
    <main className="min-h-screen bg-kc-bg px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6" data-tour="wallet-balances">
        <div>
          <h1 className="text-2xl font-semibold text-kc-fg">Ví KingCoin</h1>
          <p className="mt-2 text-sm text-kc-muted">
            Số dư KC và token nội bộ.{" "}
            <Link href="/trade" className="text-kc-accent hover:underline">
              Giao dịch →
            </Link>
          </p>
        </div>

        <Card className="border-kc-border bg-kc-elevated">
          <CardHeader>
            <CardTitle className="text-base">Số dư {QUOTE_SYMBOL}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="num text-3xl font-bold text-kc-fg">
              {formatTokenPrice(2, balances?.quoteKc ?? 0)}{" "}
              <span className="text-lg font-normal text-kc-muted">
                {QUOTE_SYMBOL}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-kc-border bg-kc-elevated">
          <CardHeader>
            <CardTitle className="text-base">Token đang nắm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!balances?.tokens?.length ? (
              <p className="text-sm text-kc-muted">Chưa có token nào.</p>
            ) : (
              balances.tokens.map((t) => {
                const meta = tokenMeta.get(t.tokenId);
                return (
                  <div
                    key={t.tokenId}
                    className="flex items-center justify-between gap-3 border-b border-kc-border/80 py-2 text-sm last:border-0"
                  >
                    <TokenIdentity
                      logo={meta?.logo}
                      symbol={t.symbol ?? meta?.symbol}
                      name={meta?.name}
                      id={t.tokenId}
                      size="sm"
                    />
                    <span className="num shrink-0">
                      {formatTokenPrice(4, t.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-kc-border bg-kc-elevated">
          <CardHeader>
            <CardTitle className="text-base">Lịch sử biến động</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] space-y-2 overflow-y-auto text-sm">
            {loading ? <p className="text-kc-muted">Đang tải…</p> : null}
            {!loading && !entries.length ? (
              <p className="text-kc-muted">Chưa có giao dịch ví.</p>
            ) : null}
            {(entries as ILedgerEntry[]).map((e) => (
              <div
                key={e.id}
                className="flex justify-between gap-2 border-b border-kc-border/60 py-2"
              >
                <div>
                  <div className="text-kc-fg">
                    {ledgerEntryLabel(e.refType, e.note)}
                  </div>
                  <div className="text-xs text-kc-muted">
                    {new Date(e.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>
                <span
                  className={`num shrink-0 font-medium ${
                    e.amount >= 0 ? "text-kc-up" : "text-kc-down"
                  }`}
                >
                  {e.amount >= 0 ? "+" : ""}
                  {formatTokenPrice(2, e.amount)} {e.currency}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
