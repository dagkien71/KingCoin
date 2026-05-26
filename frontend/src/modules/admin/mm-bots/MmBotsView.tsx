"use client";

import { Button } from "@/components/ui/button";
import { API_URL } from "@/constant/config";
import { ADMIN_TAGLINE } from "@/modules/admin/constants";
import { MmBotCard, MmBotsSummaryStat } from "@/modules/admin/mm-bots/MmBotCard";
import { useMmBots } from "@/modules/admin/mm-bots/useMmBots";
import Link from "next/link";
import { HiOutlineTrendingUp } from "react-icons/hi";

function envMmLabel(data: ReturnType<typeof useMmBots>["data"]): string {
  if (!data) return "—";
  const raw = data.diagnostics?.marketMakerEnabledRaw;
  if (raw != null && String(raw).trim()) {
    return `${data.envMmEnabled ? "bật" : "tắt"} (raw: ${raw})`;
  }
  return data.envMmEnabled ? "bật (mặc định dev)" : "tắt (mặc định prod)";
}

export function MmBotsView() {
  const {
    data,
    loading,
    error,
    refetch,
    busyEmail,
    mmBots,
    flowBots,
    runningMm,
    runningFlow,
    unconfiguredMm,
    unconfiguredFlow,
    setEnabled,
    cancelOrders,
    refreshBot,
    bootstrapping,
    bootstrapBots,
  } = useMmBots();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
            Thanh khoản
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-kc-fg">
            Quản lý Market Maker
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-kc-muted">{ADMIN_TAGLINE}</p>
          <p className="mt-2 text-xs text-kc-muted">
            Theo dõi bot MM/Flow đang treo sổ — bật/tắt từng bot, hủy lệnh hoặc
            refresh riêng. Dữ liệu làm mới mỗi 4 giây.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void refetch()}
          >
            Làm mới
          </Button>
          <Link href="/admin/market-control">
            <Button type="button" variant="ghost" size="sm" className="gap-1.5">
              <HiOutlineTrendingUp className="h-4 w-4" />
              Điều khiển giá
            </Button>
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <p className="font-medium">Không tải được dữ liệu bot từ API</p>
          <p className="mt-1 text-red-100/90">{error}</p>
          <p className="mt-2 text-xs text-red-100/80">
            Frontend đang gọi:{" "}
            <code className="break-all">{API_URL}/admin/mm-bots</code>. Trên
            Vercel cần{" "}
            <code className="text-xs">NEXT_PUBLIC_API_URL=https://kingcoin-mlnz.onrender.com/api/v1</code>{" "}
            rồi redeploy web. Đăng nhập tài khoản <strong>admin</strong>.
          </p>
        </div>
      ) : null}

      {!loading && !error && !data ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          API không trả dữ liệu — kiểm tra token admin hoặc URL API ở trên.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MmBotsSummaryStat
          label="MM đang chạy"
          value={`${runningMm} / ${mmBots.length}`}
          accent={
            data?.globalMmEnabled ? "text-emerald-300" : "text-amber-200"
          }
        />
        <MmBotsSummaryStat
          label="Flow đang chạy"
          value={`${runningFlow} / ${flowBots.length}`}
          accent={
            data?.globalFlowEnabled ? "text-emerald-300" : "text-amber-200"
          }
        />
        <MmBotsSummaryStat
          label="MM global"
          value={data?.globalMmEnabled ? "Bật" : "Tắt"}
        />
        <MmBotsSummaryStat
          label="Env MARKET_MAKER"
          value={envMmLabel(data)}
        />
      </div>

      {data?.diagnostics ? (
        <details className="rounded-lg border border-kc-border/60 bg-kc-surface/40 px-4 py-3 text-xs text-kc-muted">
          <summary className="cursor-pointer font-medium text-kc-fg">
            Runtime server (Render)
          </summary>
          <ul className="mt-2 space-y-1 font-mono">
            <li>NODE_ENV: {data.diagnostics.nodeEnv ?? "—"}</li>
            <li>
              MARKET_MAKER_ENABLED:{" "}
              {data.diagnostics.marketMakerEnabledRaw ?? "(không set)"}
            </li>
            <li>
              MARKET_MAKER_BOT_COUNT:{" "}
              {data.diagnostics.marketMakerBotCountRaw ?? "(mặc định prod=12)"}
            </li>
            <li>
              Cấu hình MM: {data.diagnostics.configuredMmEmails.length} email —{" "}
              {data.diagnostics.configuredMmEmails.slice(0, 3).join(", ")}
              {data.diagnostics.configuredMmEmails.length > 3 ? "…" : ""}
            </li>
            <li>
              Cấu hình Flow: {data.diagnostics.configuredFlowEmails.length}{" "}
              email
            </li>
            {data.adminOverrideMmEnabled != null ? (
              <li className="text-amber-200">
                Admin override MM: {String(data.adminOverrideMmEnabled)} (từ Điều
                khiển thị trường — mất khi restart server)
              </li>
            ) : null}
          </ul>
        </details>
      ) : null}

      {!data?.globalMmEnabled && data && !error ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          MM toàn cục đang tắt — bật tại{" "}
          <Link href="/admin/market-control" className="underline">
            Điều khiển thị trường
          </Link>{" "}
          hoặc set <code className="text-xs">MARKET_MAKER_ENABLED=true</code> trên
          server.
        </p>
      ) : null}

      {data && unconfiguredMm + unconfiguredFlow > 0 ? (
        <p className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100/90">
          {unconfiguredMm + unconfiguredFlow} bot chưa có user trong DB — bấm{" "}
          <strong>Tạo/sync bot trong DB</strong> (không cần Shell Render). Mỗi
          lần deploy backend, script bootstrap trên server cũng chạy tự động.
        </p>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-kc-fg">
          Bot MM treo sổ ({mmBots.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {mmBots.map((bot) => (
            <MmBotCard
              key={bot.email}
              bot={bot}
              busy={busyEmail === bot.email}
              onToggle={(enabled) => void setEnabled(bot.email, enabled)}
              onCancelOrders={() => void cancelOrders(bot.email)}
              onRefresh={() => void refreshBot(bot.email)}
            />
          ))}
        </div>
        {loading && mmBots.length === 0 ? (
          <p className="text-sm text-kc-muted">Đang tải…</p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-kc-fg">
          Bot Flow khớp taker ({flowBots.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {flowBots.map((bot) => (
            <MmBotCard
              key={bot.email}
              bot={bot}
              busy={busyEmail === bot.email}
              onToggle={(enabled) => void setEnabled(bot.email, enabled)}
              onCancelOrders={() => void cancelOrders(bot.email)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default MmBotsView;
