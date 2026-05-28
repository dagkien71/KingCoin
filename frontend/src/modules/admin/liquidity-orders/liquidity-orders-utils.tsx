import type { LiquidityBotRole } from "@/modules/admin/liquidity-orders/liquidity-orders-types";
import clsx from "clsx";

export const BOT_ROLE_LABEL: Record<LiquidityBotRole, string> = {
  mm: "MM",
  flow: "Flow",
  user_bot: "User-bot",
};

export function BotRoleBadge({ role }: { role: LiquidityBotRole }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        role === "mm" && "bg-violet-500/20 text-violet-200",
        role === "flow" && "bg-cyan-500/20 text-cyan-200",
        role === "user_bot" && "bg-amber-500/20 text-amber-200",
      )}
    >
      {BOT_ROLE_LABEL[role]}
    </span>
  );
}

export function SideBadge({ side }: { side: "buy" | "sell" }) {
  return (
    <span
      className={clsx(
        "num inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
        side === "buy" ? "bg-kc-up/20 text-kc-up" : "bg-kc-down/20 text-kc-down",
      )}
    >
      {side === "buy" ? "Mua" : "Bán"}
    </span>
  );
}

export function formatOrderTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ageLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)} phút`;
  return `${Math.floor(ms / 3600_000)} giờ`;
}
