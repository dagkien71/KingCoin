"use client";

import { Button } from "@/components/ui/button";
import { API_URL } from "@/constant/config";
import { ADMIN_TAGLINE } from "@/modules/admin/constants";
import { MmBotCard, MmBotsSummaryStat } from "@/modules/admin/mm-bots/MmBotCard";
import { MmTokenBotGroup } from "@/modules/admin/mm-bots/MmTokenBotGroup";
import { useMmBots } from "@/modules/admin/mm-bots/useMmBots";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
    displayTokenGroups,
    dedicatedPool,
    botsPerToken,
    mmBots,
    flowBots,
    runningMm,
    runningFlow,
    totalBots,
    unconfiguredTotal,
    setEnabled,
    cancelOrders,
    refreshBot,
    bootstrapping,
    bootstrapBots,
  } = useMmBots();

  const showLegacyPools =
    !loading &&
    displayTokenGroups.length === 0 &&
    (mmBots.length > 0 || flowBots.length > 0);
  const showEmptyCatalog =
    !loading && !error && displayTokenGroups.length === 0 && totalBots === 0;

  const groupIds = displayTokenGroups.map((g) => g.tokenId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedIds((prev) => {
      const next = new Set<string>();
      if (groupIds.length === 0) return next;
      if (groupIds.length <= 2) {
        groupIds.forEach((id) => next.add(id));
        return next;
      }
      const first = groupIds[0];
      if (prev.size === 0) {
        next.add(first);
        return next;
      }
      for (const id of groupIds) {
        if (prev.has(id)) next.add(id);
      }
      if (next.size === 0) next.add(first);
      return next;
    });
  }, [groupIds.join("|")]);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(groupIds));
  }, [groupIds]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const toggleGroup = useCallback((tokenId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  }, []);

  const hasTokenGroups = displayTokenGroups.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
            Thanh khoản
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-kc-fg">
            Bot theo token
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-kc-muted">{ADMIN_TAGLINE}</p>
          <p className="mt-2 text-xs text-kc-muted">
            Mỗi token alt có đúng{" "}
            <strong className="text-kc-fg">{botsPerToken} bot</strong> (6 MM treo
            sổ + 4 flow taker) — chỉ mua/bán trên token đó, không quét chéo.
            Làm mới mỗi 4 giây.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || bootstrapping}
            onClick={() => void bootstrapBots()}
          >
            {bootstrapping ? "Đang tạo bot…" : "Tạo/sync bot trong DB"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={() => void refetch()}
          >
            Làm mới
          </Button>
          <Link href="/admin/market-settings">
            <Button type="button" variant="ghost" size="sm">
              Cài đặt MM
            </Button>
          </Link>
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
            API:{" "}
            <code className="break-all">{API_URL}/admin/mm-bots</code>
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MmBotsSummaryStat
          label="Token có bot"
          value={String(displayTokenGroups.length)}
        />
        <MmBotsSummaryStat
          label="Bot đang chạy"
          value={`${runningMm + runningFlow} / ${totalBots}`}
          accent={
            data?.globalMmEnabled ? "text-emerald-300" : "text-amber-200"
          }
        />
        <MmBotsSummaryStat
          label="MM / Flow chạy"
          value={`${runningMm} MM · ${runningFlow} flow`}
        />
        <MmBotsSummaryStat
          label="Chế độ pool"
          value={dedicatedPool ? `${botsPerToken} bot/token` : "Legacy"}
        />
      </div>

      {!data?.globalMmEnabled && data && !error ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          MM toàn cục đang tắt — bật tại{" "}
          <Link href="/admin/market-control" className="underline">
            Điều khiển thị trường
          </Link>
          .
        </p>
      ) : null}

      {unconfiguredTotal > 0 ? (
        <p className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100/90">
          {unconfiguredTotal} bot chưa có user trong DB — bấm{" "}
          <strong>Tạo/sync bot trong DB</strong>.
        </p>
      ) : null}

      {showEmptyCatalog ? (
        <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.06] px-5 py-6 text-sm text-kc-muted">
          <p className="font-medium text-kc-fg">Chưa có bot nào để hiển thị</p>
          <p className="mt-2">
            Cần ít nhất một token alt đang{" "}
            <code className="text-xs text-violet-200">active</code> trên sàn và
            API đã restart sau khi bật pool 10 bot/token. Sau đó bấm{" "}
            <strong className="text-kc-fg">Tạo/sync bot trong DB</strong>.
          </p>
          <p className="mt-2 text-xs">
            Đường dẫn:{" "}
            <code className="text-violet-200">/admin/mm-bots</code> — mục sidebar{" "}
            <strong className="text-kc-fg">Bot MM</strong> (ngay dưới Điều khiển
            thị trường).
          </p>
        </div>
      ) : null}

      {loading && displayTokenGroups.length === 0 && totalBots === 0 ? (
        <p className="text-sm text-kc-muted">Đang tải…</p>
      ) : null}

      {hasTokenGroups ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-kc-muted">
            {expandedIds.size}/{displayTokenGroups.length} token đang mở
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={expandAll}
            >
              Mở tất cả
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={collapseAll}
            >
              Thu gọn tất cả
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {displayTokenGroups.map((group) => (
          <MmTokenBotGroup
            key={group.tokenId}
            group={group}
            botsPerToken={botsPerToken}
            expanded={expandedIds.has(group.tokenId)}
            onToggleExpanded={() => toggleGroup(group.tokenId)}
            busyEmail={busyEmail}
            onSetEnabled={(email, enabled) => void setEnabled(email, enabled)}
            onCancelOrders={(email) => void cancelOrders(email)}
            onRefreshBot={(email) => void refreshBot(email)}
          />
        ))}
      </div>

      {showLegacyPools ? (
        <>
          {!dedicatedPool ? (
            <p className="text-xs text-amber-200/80">
              Pool legacy — bật 10 bot/token: bỏ{" "}
              <code className="text-[11px]">MARKET_LEGACY_BOT_POOL</code> và
              restart API.
            </p>
          ) : (
            <p className="text-xs text-amber-200/80">
              API chưa trả nhóm theo token — hiển thị danh sách phẳng. Restart
              backend và làm mới trang.
            </p>
          )}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-kc-fg">
              Bot MM ({mmBots.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
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
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-kc-fg">
              Bot Flow ({flowBots.length})
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {flowBots.map((bot) => (
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
          </section>
        </>
      ) : null}

      {!dedicatedPool && data?.bots.length && displayTokenGroups.length > 0 ? (
        <p className="text-xs text-amber-200/80">
          Đang dùng pool legacy (MARKET_LEGACY_BOT_POOL). Để bật 10 bot/token,
          bỏ env đó và restart API.
        </p>
      ) : null}

      {data?.diagnostics ? (
        <details className="rounded-lg border border-kc-border/60 bg-kc-surface/40 px-4 py-3 text-xs text-kc-muted">
          <summary className="cursor-pointer font-medium text-kc-fg">
            Runtime server
          </summary>
          <ul className="mt-2 space-y-1 font-mono">
            <li>NODE_ENV: {data.diagnostics.nodeEnv ?? "—"}</li>
            <li>MARKET_MAKER_ENABLED: {envMmLabel(data)}</li>
            <li>
              Bot email: {data.diagnostics.configuredMmEmails.length} MM +{" "}
              {data.diagnostics.configuredFlowEmails.length} flow
            </li>
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export default MmBotsView;
