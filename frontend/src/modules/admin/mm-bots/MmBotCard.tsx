"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { MmBotRow } from "@/modules/admin/mm-bots/mm-bots-types";
import { formatMarketCap } from "@/utils/format-number";
import {
  HiOutlineBan,
  HiOutlineCheckCircle,
  HiOutlineRefresh,
  HiOutlineXCircle,
} from "react-icons/hi";

function formatLastRefresh(ts: number | null): string {
  if (!ts) return "Chưa refresh";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 5) return "Vừa xong";
  if (sec < 60) return `${sec}s trước`;
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  return new Date(ts).toLocaleString("vi-VN");
}

type Props = {
  bot: MmBotRow;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onCancelOrders: () => void;
  onRefresh?: () => void;
};

export function MmBotCard({
  bot,
  busy,
  onToggle,
  onCancelOrders,
  onRefresh,
}: Props) {
  const isMm = bot.kind === "mm";
  const statusLabel = !bot.configured
    ? "Chưa tạo user"
    : bot.running
      ? "Đang chạy"
      : !bot.enabled
        ? "Tắt (admin)"
        : "Tạm dừng";

  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border p-4 shadow-sm transition",
        bot.running
          ? "border-emerald-500/35 bg-emerald-500/[0.06]"
          : "border-violet-500/20 bg-[#0c0a14]/60",
        !bot.configured && "opacity-75"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                isMm
                  ? "bg-violet-500/25 text-violet-200"
                  : "bg-cyan-500/20 text-cyan-200"
              )}
            >
              {isMm ? "MM" : "Flow"}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                bot.running ? "text-emerald-300" : "text-kc-muted"
              )}
            >
              {bot.running ? (
                <HiOutlineCheckCircle className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <HiOutlineXCircle className="h-3.5 w-3.5" aria-hidden />
              )}
              {statusLabel}
            </span>
          </div>
          <h3 className="mt-2 truncate font-semibold text-kc-fg">
            {bot.username ?? bot.email.split("@")[0]}
          </h3>
          <p className="truncate text-xs text-kc-muted">{bot.email}</p>
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-kc-muted">
            {bot.enabled ? "Bật" : "Tắt"}
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-kc-border bg-kc-bg accent-violet-500"
            checked={bot.enabled}
            disabled={busy || !bot.configured}
            onChange={(e) => onToggle(e.target.checked)}
            aria-label={`Bật/tắt ${bot.email}`}
          />
        </label>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-kc-muted">Lệnh chờ</dt>
          <dd className="num font-semibold text-kc-fg">{bot.pendingOrders}</dd>
        </div>
        <div>
          <dt className="text-kc-muted">KC</dt>
          <dd className="num font-medium text-kc-fg">
            {formatMarketCap(bot.kcBalance).replace(" KC", "")}
          </dd>
        </div>
        <div>
          <dt className="text-kc-muted">Token base</dt>
          <dd className="num font-medium text-kc-fg">{bot.baseTokenKinds}</dd>
        </div>
        <div>
          <dt className="text-kc-muted">Refresh</dt>
          <dd className="num font-medium text-kc-fg">{bot.refreshCount}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-kc-muted">Lần cuối</dt>
          <dd
            className={cn(
              "font-medium",
              bot.lastRefreshOk ? "text-kc-fg" : "text-red-300"
            )}
          >
            {formatLastRefresh(bot.lastRefreshAt)}
            {!bot.lastRefreshOk && bot.lastError ? (
              <span className="mt-0.5 block text-[11px] text-red-300/90">
                {bot.lastError}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {isMm && bot.enabled && bot.configured ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={onRefresh}
            className="gap-1.5"
          >
            <HiOutlineRefresh
              className={cn("h-4 w-4", busy && "animate-spin")}
            />
            Refresh sổ
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy || bot.pendingOrders === 0}
          onClick={onCancelOrders}
          className="gap-1.5 text-kc-muted"
        >
          <HiOutlineBan className="h-4 w-4" />
          Hủy lệnh
        </Button>
      </div>

      {!bot.configured ? (
        <p className="mt-3 text-[11px] leading-relaxed text-amber-200/80">
          Chạy{" "}
          <code className="rounded bg-black/30 px-1">
            ensure-liquidity-bots.js
          </code>{" "}
          trên API để tạo user.
        </p>
      ) : null}
    </article>
  );
}

export function MmBotsSummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-kc-muted">
        {label}
      </p>
      <p className={cn("mt-1 text-xl font-semibold", accent ?? "text-kc-fg")}>
        {value}
      </p>
    </div>
  );
}
