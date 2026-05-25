"use client";

import { QUOTE_SYMBOL } from "@/constants/quote";
import { tokenLogoFallbackSrc } from "@/components/token/TokenLogo";
import { cn } from "@/lib/cn";
import { listingEconomicsSummary } from "@/lib/token/create-validation";
import type { ICreateTokenCrypto } from "@/types/token.type";
import { motion } from "framer-motion";
import {
  HiOutlineBadgeCheck,
  HiOutlineChartBar,
  HiOutlineSparkles,
} from "react-icons/hi";

type Props = {
  form: ICreateTokenCrypto;
  className?: string;
};

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function TokenMintPreview({ form, className }: Props) {
  const symbol = form.symbol?.trim().toUpperCase() || "???";
  const name = form.name?.trim() || "Tên token của bạn";
  const econ = listingEconomicsSummary(form);
  const price = econ.price;
  const marketCap = econ.mcap;
  const fdv = econ.fdv;
  const logoSrc =
    form.logo?.trim() ||
    tokenLogoFallbackSrc(form.symbol, form.name, undefined);

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-transparent to-amber-500/10 blur-2xl" />

      <motion.div
        layout
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#111a28] to-[#0a0f18] shadow-[0_0_60px_-12px_rgba(16,185,129,0.35)]"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

        <div className="border-b border-white/[0.06] px-5 py-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-kc-muted">
            <span className="flex items-center gap-1.5 text-emerald-400/90">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live preview
            </span>
            <span>KingCoin Studio</span>
          </div>
        </div>

        <div className="px-5 pb-5 pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="absolute -inset-3 animate-[spin_8s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,transparent,rgba(16,185,129,0.5),transparent,rgba(212,160,18,0.35),transparent)] opacity-70" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-[#0d141f] p-1 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-600 text-white shadow-lg">
                <HiOutlineSparkles className="h-3.5 w-3.5" />
              </span>
            </div>

            <motion.h2
              key={name}
              initial={{ opacity: 0.6, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-full truncate text-lg font-semibold text-kc-fg"
            >
              {name}
            </motion.h2>
            <motion.p
              key={symbol}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="mt-1 font-mono text-2xl font-bold tracking-wider text-gradient-kc"
            >
              {symbol}
            </motion.p>
            <p className="mt-1 text-xs text-emerald-400/90">{econ.categoryLabel}</p>
            {form.description?.trim() ? (
              <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-kc-muted">
                {form.description.trim()}
              </p>
            ) : (
              <p className="mt-3 text-xs italic text-kc-muted/70">
                Mô tả sẽ hiện ở đây…
              </p>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-kc-muted">
                Giá khởi điểm
              </p>
              <p className="num mt-0.5 text-sm font-semibold text-emerald-300">
                {formatNum(price)} {QUOTE_SYMBOL}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-kc-muted">
                Vốn hoá (pool)
              </p>
              <p className="num mt-0.5 text-sm font-semibold text-kc-fg">
                {formatNum(marketCap)} {QUOTE_SYMBOL}
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400/80">
                  <HiOutlineChartBar className="h-3.5 w-3.5" />
                  FDV (tổng cung × giá)
                </div>
                <HiOutlineBadgeCheck className="h-4 w-4 text-emerald-500/50" />
              </div>
              <p className="num mt-1 text-base font-semibold text-kc-fg">
                {formatNum(fdv)} {QUOTE_SYMBOL}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {(["website", "telegram", "discord", "twitter"] as const).map(
              (p) => {
                const linked = Boolean(form.communityLinks?.[p]?.trim());
                return (
                  <span
                    key={p}
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] capitalize",
                      linked
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/[0.04] text-kc-muted/50"
                    )}
                  >
                    {p}
                  </span>
                );
              }
            )}
          </div>
        </div>
      </motion.div>

      <p className="mt-3 text-center text-[11px] text-kc-muted">
        Xem trước thẻ niêm yết — cập nhật theo từng trường bạn nhập
      </p>
    </div>
  );
}
