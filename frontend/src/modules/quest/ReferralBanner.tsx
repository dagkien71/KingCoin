"use client";

import { Button } from "@/components/ui/button";
import useFetchApi from "@/hooks/useFetchApi";
import { buildReferralRegisterUrl, copyToClipboard } from "@/lib/share";
import type { IReferralStats } from "@/types/trade.type";
import { useState } from "react";
import { toast } from "react-toastify";

export function ReferralBanner() {
  const { data, loading } = useFetchApi<IReferralStats>("/users/me/referral");
  const [busy, setBusy] = useState(false);

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-kc-border bg-kc-surface p-4 text-sm text-kc-muted">
        Đang tải mã giới thiệu…
      </div>
    );
  }

  if (!data) return null;

  const link = data.link || buildReferralRegisterUrl(data.code);

  const copy = async (text: string, msg: string) => {
    setBusy(true);
    const ok = await copyToClipboard(text);
    setBusy(false);
    if (ok) toast.success(msg);
    else toast.error("Không copy được");
  };

  return (
    <div className="rounded-xl border border-kc-accent/40 bg-gradient-to-br from-kc-accent/15 to-kc-surface p-5">
      <h2 className="text-lg font-semibold text-kc-fg">Lan tỏa KingCoin — kiếm KC</h2>
      <p className="mt-1 text-sm text-kc-muted">
        Mời bạn đăng ký và giao dịch để nhận tới{" "}
        <strong className="text-kc-accent">1.600+ KC</strong> từ nhiệm vụ mời.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="rounded-lg border border-kc-border bg-kc-bg px-4 py-2">
          <span className="text-xs text-kc-muted">Mã của bạn</span>
          <p className="num text-xl font-bold tracking-wide text-kc-accent">
            {data.code}
          </p>
        </div>
        <div className="text-sm text-kc-muted">
          Đã mời: <span className="num text-kc-fg">{data.totalReferees}</span> ·
          Đã giao dịch:{" "}
          <span className="num text-kc-up">{data.qualifiedReferees}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          type="button"
          disabled={busy}
          onClick={() => void copy(link, "Đã copy link mời")}
        >
          Copy link mời
        </Button>
        <Button
          size="sm"
          variant="secondary"
          type="button"
          disabled={busy}
          onClick={() => void copy(data.code, "Đã copy mã")}
        >
          Copy mã
        </Button>
      </div>
    </div>
  );
}
