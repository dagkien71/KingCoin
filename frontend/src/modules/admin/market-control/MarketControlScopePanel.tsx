"use client";

import { Button } from "@/components/ui/button";
import { TokenIdentity } from "@/components/token/TokenLogo";
import { targetLabel } from "@/modules/admin/market-control-target";
import { AdminSection } from "@/modules/admin/AdminSection";
import type { MarketControlState } from "./useMarketControl";

type Props = { mc: MarketControlState };

export function MarketControlScopePanel({ mc }: Props) {
  const {
    data,
    targetMode,
    setTargetMode,
    selectedId,
    setSelectedId,
    groupIds,
    setGroupIds,
    altTokens,
    selected,
    tokenId,
    selectedIsStable,
  } = mc;

  return (
    <>
    <AdminSection
      step={1}
      title="Phạm vi áp dụng setup"
      subtitle="Chọn phạm vi và mã alt trước khi áp preset hoặc bàn điều khiển."
    >
<div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["single", "Một mã"],
            ["group", "Nhóm chọn"],
            ["all", "Tất cả alt"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTargetMode(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              targetMode === id
                ? "bg-violet-500 text-white"
                : "border border-kc-border text-kc-muted hover:text-kc-fg"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {targetMode === "single" ? (
        <div className="mt-4">
          <label
            htmlFor="mc-token-select"
            className="text-xs font-medium uppercase tracking-wide text-kc-muted"
          >
            Chọn mã alt
          </label>
          <select
            id="mc-token-select"
            className="mt-2 w-full rounded-lg border border-violet-500/40 bg-kc-bg px-3 py-2.5 text-sm font-medium"
            value={tokenId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {(data?.tokens ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.symbol} — {t.name} · {t.price}
                {t.modelRun?.isActive
                  ? ` · mô hình ${t.modelRun.modelId}`
                  : t.schedule?.isActive
                    ? " · đang lịch"
                    : ""}
              </option>
            ))}
          </select>
          {selected ? (
            <div className="mt-2">
              <TokenIdentity
                logo={selected.logo}
                symbol={selected.symbol}
                name={selected.name}
                id={selected.id}
                size="md"
                subline={`Giá ${selected.price}`}
              />
            </div>
          ) : null}
          {selectedIsStable && (
            <p className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100/90">
              KC là stablecoin — không pump/dump; chỉ spread / đặt giá neo.
            </p>
          )}
        </div>
      ) : null}

      {targetMode === "group" ? (
        <div className="mt-4 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-kc-border bg-kc-bg p-3">
          <div className="flex flex-wrap gap-2 pb-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setGroupIds(altTokens.map((t) => t.id))}
            >
              Chọn tất cả
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setGroupIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
          {altTokens.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-kc-border text-violet-500"
                checked={groupIds.includes(t.id)}
                onChange={(e) => {
                  setGroupIds((prev) =>
                    e.target.checked
                      ? [...prev, t.id]
                      : prev.filter((id) => id !== t.id)
                  );
                }}
              />
              <TokenIdentity
                logo={t.logo}
                symbol={t.symbol}
                name={t.name}
                id={t.id}
                size="xs"
                nameFirst
                subline={
                  <>
                    {t.schedule?.isActive ? "· lịch " : ""}
                    {t.modelRun?.isActive ? "· mô hình" : ""}
                  </>
                }
              />
            </label>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-sm text-violet-200/90">
        Setup sẽ áp dụng:{" "}
        <strong>
          {targetMode === "single" && selected ? (
            <span className="inline-flex items-center gap-2">
              Một mã —
              <TokenIdentity
                logo={selected.logo}
                symbol={selected.symbol}
                name={selected.name}
                id={selected.id}
                size="xs"
                className="inline-flex"
              />
            </span>
          ) : (
            targetLabel(targetMode, groupIds.length, altTokens.length)
          )}
        </strong>
      </p>
    
    </AdminSection>
    </>
  );
}
