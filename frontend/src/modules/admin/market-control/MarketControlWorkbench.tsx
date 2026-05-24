"use client";

import { Button } from "@/components/ui/button";
import { TokenIdentity } from "@/components/token/TokenLogo";
import ScenarioLauncher from "@/modules/admin/ScenarioLauncher";
import { targetLabel } from "@/modules/admin/market-control-target";
import { isStablecoinToken } from "@/types/token.type";
import { toast } from "react-toastify";
import { AdminSection } from "@/modules/admin/AdminSection";
import {
  formatRemainingMs,
  formatScheduleTime,
  StatBox,
} from "./market-control-utils";
import type { MarketControlState } from "./useMarketControl";

type Props = { mc: MarketControlState };

export function MarketControlWorkbench({ mc }: Props) {
  const {
    data,
    refetch,
    busyId,
    setBusyId,
    setSelectedId,
    targetMode,
    groupIds,
    altTokens,
    applyTarget,
    selected,
    tokenId,
    selectedIsStable,
    postAction,
    cancelModelRun,
  } = mc;

  return (
    <div className="space-y-5">
{(() => {
      const refToken =
        targetMode === "single"
          ? selected
          : targetMode === "group"
            ? altTokens.find((t) => t.id === groupIds[0]) ?? altTokens[0]
            : altTokens[0];
      if (targetMode === "single" && !refToken) {
        return (
          <p className="rounded-xl border border-dashed border-kc-border px-4 py-6 text-center text-sm text-kc-muted">
            Chọn mã alt ở trên để dùng bàn điều khiển và xem trạng thái.
          </p>
        );
      }
      if (!refToken) return null;
      if (targetMode === "single" && selectedIsStable) {
        return (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/90">
            KC stablecoin — không dùng bàn điều khiển pump/dump. Chọn alt khác
            hoặc phạm vi nhóm / tất cả alt.
          </p>
        );
      }
      return (
        <ScenarioLauncher
          applyTarget={applyTarget}
          tokenId={refToken.id}
          altCount={altTokens.length}
          groupCount={groupIds.length}
          refSpot={refToken.price}
          refSymbol={refToken.symbol ?? refToken.name}
          refLogo={refToken.logo}
          nudgeDisabled={isStablecoinToken(refToken)}
          pathBlocked={
            targetMode === "single" &&
            Boolean(
              selected?.schedule?.isActive || selected?.modelRun?.isActive
            )
          }
          busy={busyId !== null}
          onBusyChange={(v) => setBusyId(v ? "scenario" : null)}
          postAction={postAction}
          onDone={async () => {
            toast.success("Đã chạy kịch bản");
            await refetch();
          }}
        />
      );
    })()}

    {/* Trạng thái mã đang chọn / xem */}
    <AdminSection step={2} title="Trạng thái mã" subtitle="Giá spot, MM/Flow và tiến độ lịch hoặc mô hình đang chạy.">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {targetMode === "single" && selected ? (
            <div className="mt-2">
              <span className="text-xs text-kc-muted">Đang xem</span>
              <TokenIdentity
                logo={selected.logo}
                symbol={selected.symbol}
                name={selected.name}
                id={selected.id}
                size="sm"
                nameFirst
                className="mt-1"
              />
            </div>
          ) : (
            <p className="mt-1 text-xs text-kc-muted">
              Setup áp dụng cho{" "}
              <strong className="text-violet-300">
                {targetLabel(targetMode, groupIds.length, altTokens.length)}
              </strong>
              . Chọn mã để xem giá / lịch / mô hình.
            </p>
          )}
        </div>
        {targetMode !== "single" ? (
          <div className="min-w-[200px] flex-1 sm:max-w-xs">
            <label
              htmlFor="mc-token-inspect"
              className="sr-only"
            >
              Xem chi tiết mã
            </label>
            <select
              id="mc-token-inspect"
              className="w-full rounded-lg border border-kc-border bg-kc-bg px-3 py-2 text-sm"
              value={tokenId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {(data?.tokens ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.symbol}) — {t.price}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {selected && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <StatBox label="Giá spot" value={String(selected.price)} />
          <StatBox label="Mid sổ" value={selected.mid != null ? String(selected.mid) : "—"} />
          <StatBox
            label="MM"
            value={data?.mmEnabled ? "Bật" : "Tắt"}
            ok={data?.mmEnabled}
          />
          <StatBox
            label="Flow"
            value={data?.flowEnabled ? "Bật" : "Tắt"}
            ok={data?.flowEnabled}
          />
        </div>
      )}

      {selected?.modelRun?.isActive && (
        <div className="mt-4 rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="text-violet-300">Mô hình PP2</strong> ·{" "}
              {selected.modelRun.modelId} · {selected.modelRun.status}
            </span>
            {selected.modelRun.currentTarget != null && (
              <span className="num text-kc-fg">
                → {selected.modelRun.currentTarget}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-kc-muted">
            {formatScheduleTime(selected.modelRun.startAt)} –{" "}
            {formatScheduleTime(selected.modelRun.endAt)}
            {" · "}
            {formatRemainingMs(
              selected.modelRun.endAt - Date.now()
            )}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-kc-border">
            <div
              className="h-full bg-violet-400 transition-all"
              style={{
                width: `${Math.round((selected.modelRun.progress ?? 0) * 100)}%`,
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            disabled={busyId !== null}
            onClick={() => void cancelModelRun()}
          >
            Hủy mô hình
          </Button>
        </div>
      )}

      {selected?.schedule && !selected.modelRun?.isActive && (
        <div className="mt-4 rounded-lg border border-kc-accent/40 bg-kc-accent/10 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="text-kc-accent">Lịch PP1</strong> ·{" "}
              {selected.schedule.status}
            </span>
            {selected.schedule.currentTarget != null && (
              <span className="num text-kc-fg">
                → {selected.schedule.currentTarget}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-kc-muted">
            {formatScheduleTime(selected.schedule.startAt)} –{" "}
            {formatScheduleTime(selected.schedule.endAt)}
            {" · "}
            {formatRemainingMs(
              selected.schedule.endAt - Date.now()
            )}{" "}
            · [{selected.schedule.priceMin} – {selected.schedule.priceMax}]
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-kc-border">
            <div
              className="h-full bg-kc-accent transition-all"
              style={{
                width: `${Math.round((selected.schedule.progress ?? 0) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </AdminSection>
    </div>
  );
}
