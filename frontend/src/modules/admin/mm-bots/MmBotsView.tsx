"use client";

import { Button } from "@/components/ui/button";
import { ADMIN_TAGLINE } from "@/modules/admin/constants";
import { MmBotCard, MmBotsSummaryStat } from "@/modules/admin/mm-bots/MmBotCard";
import { useMmBots } from "@/modules/admin/mm-bots/useMmBots";
import Link from "next/link";
import { HiOutlineTrendingUp } from "react-icons/hi";

export function MmBotsView() {
  const {
    data,
    loading,
    refetch,
    busyEmail,
    mmBots,
    flowBots,
    runningMm,
    runningFlow,
    setEnabled,
    cancelOrders,
    refreshBot,
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
          value={data?.envMmEnabled ? "true" : "false / mặc định"}
        />
      </div>

      {!data?.globalMmEnabled ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          MM toàn cục đang tắt — bật tại{" "}
          <Link href="/admin/market-control" className="underline">
            Điều khiển thị trường
          </Link>{" "}
          hoặc set <code className="text-xs">MARKET_MAKER_ENABLED=true</code> trên
          server.
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
