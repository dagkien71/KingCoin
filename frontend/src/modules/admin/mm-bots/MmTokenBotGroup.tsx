"use client";

import { cn } from "@/lib/cn";
import { MmBotCard } from "@/modules/admin/mm-bots/MmBotCard";
import type { TokenBotGroup } from "@/modules/admin/mm-bots/mm-bots-types";
import { HiChevronDown } from "react-icons/hi";

type Props = {
  group: TokenBotGroup;
  botsPerToken: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  busyEmail: string | null;
  onSetEnabled: (email: string, enabled: boolean) => void;
  onCancelOrders: (email: string) => void;
  onRefreshBot: (email: string) => void;
};

export function MmTokenBotGroup({
  group,
  botsPerToken,
  expanded,
  onToggleExpanded,
  busyEmail,
  onSetEnabled,
  onCancelOrders,
  onRefreshBot,
}: Props) {
  const mmCount = group.bots.filter((b) => b.kind === "mm").length;
  const flowCount = group.bots.filter((b) => b.kind === "flow").length;
  const running = group.bots.filter((b) => b.running).length;
  const unconfigured = group.bots.filter((b) => !b.configured).length;

  return (
    <section className="overflow-hidden rounded-xl border border-violet-500/20 bg-[#0c0a14]/40">
      <button
        type="button"
        onClick={onToggleExpanded}
        aria-expanded={expanded ? "true" : "false"}
        className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-violet-500/[0.06]"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-kc-fg">
            {group.symbol}
            <span className="ml-2 text-sm font-normal text-kc-muted">
              {group.tokenName}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-kc-muted">
            {botsPerToken} bot · {mmCount} MM · {flowCount} flow ·{" "}
            <span
              className={cn(
                running > 0 ? "text-emerald-300/90" : "text-kc-muted"
              )}
            >
              {running} đang chạy
            </span>
            {unconfigured > 0 ? (
              <span className="text-amber-200/90">
                {" "}
                · {unconfigured} chưa sync
              </span>
            ) : null}
          </p>
        </div>
        <span
          className={cn(
            "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-200 transition-transform",
            expanded && "rotate-180"
          )}
          aria-hidden
        >
          <HiChevronDown className="h-5 w-5" />
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-violet-500/15 px-4 pb-4 pt-1">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {group.bots.map((bot) => (
              <MmBotCard
                key={bot.email}
                bot={bot}
                busy={busyEmail === bot.email}
                onToggle={(enabled) => onSetEnabled(bot.email, enabled)}
                onCancelOrders={() => onCancelOrders(bot.email)}
                onRefresh={() => onRefreshBot(bot.email)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
