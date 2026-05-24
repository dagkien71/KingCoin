"use client";

import {
  MARKET_PRESETS,
  PRESET_GROUPS,
  type PresetScope,
} from "@/modules/admin/market-control-presets";
import {
  MODEL_PRESET_GROUPS,
  PRICE_MODEL_PRESETS,
} from "@/modules/admin/market-model-presets";
import { AdminSection } from "@/modules/admin/AdminSection";
import { TONE_STYLES } from "./market-control-utils";
import type { MarketControlState } from "./useMarketControl";

type Props = { mc: MarketControlState };

export function MarketControlPresets({ mc }: Props) {
  const {
    controlMethod,
    setControlMethod,
    selected,
    presetCtx,
    busyId,
    applyPreset,
    applyModelPreset,
  } = mc;

  return (
    <AdminSection
      step={3}
      title="Preset & mô hình giá"
      subtitle="PP1 combo/lịch và PP2 mô hình — pump/dump nhanh dùng bàn điều khiển phía trên."
    >
<div className="flex gap-2 rounded-xl border border-kc-border bg-kc-surface p-1">
      <button
        type="button"
        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
          controlMethod === "pp1"
            ? "bg-kc-accent text-kc-bg"
            : "text-kc-muted hover:text-kc-fg"
        }`}
        onClick={() => setControlMethod("pp1")}
      >
        PP1 — Combo & lịch sin
      </button>
      <button
        type="button"
        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
          controlMethod === "pp2"
            ? "bg-violet-500 text-white"
            : "text-kc-muted hover:text-kc-fg"
        }`}
        onClick={() => setControlMethod("pp2")}
      >
        PP2 — Mô hình giá
      </button>
    </div>

    {controlMethod === "pp1" && (
    <section className="space-y-8">
      <p className="rounded-lg border border-kc-border bg-kc-bg/60 px-3 py-2 text-xs text-kc-muted">
        Pump/Dump/Sideway theo % tùy chọn — dùng{" "}
        <strong className="text-violet-300">Bàn điều khiển nhanh</strong>{" "}
        phía trên. Các gói dưới đây: spread, hệ thống, lịch cố định.
      </p>
      {(["token", "global"] as PresetScope[]).map((scope) => {
        const scopeTitle =
          scope === "token"
            ? `Theo token: ${selected?.symbol ?? selected?.name ?? "—"}`
            : "Toàn hệ thống";
        const scopeHint =
          scope === "token"
            ? "Lịch, ±%, spread sổ, reset — chỉ mã đang chọn"
            : "Bật/tắt MM+Flow, refresh mọi sổ";
        const hasAny = MARKET_PRESETS.some((p) => p.scope === scope);
        if (!hasAny) return null;
        return (
          <div key={scope} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">{scopeTitle}</h2>
              <p className="text-xs text-kc-muted">{scopeHint}</p>
            </div>
            {PRESET_GROUPS.map((group) => {
              const presets = MARKET_PRESETS.filter(
                (p) =>
                  p.group === group.id &&
                  p.scope === scope &&
                  ![
                    "sched-sideway-15",
                    "sched-sideway-30",
                    "sched-pump-10",
                    "sched-dump-10",
                    "sched-volatile-20",
                    "sched-hour-band",
                    "instant-up-3",
                    "instant-down-3",
                  ].includes(p.id)
              );
              if (!presets.length) return null;
              return (
                <div key={`${scope}-${group.id}`}>
                  <div className="mb-2">
                    <h3 className="text-base font-semibold">{group.label}</h3>
                    <p className="text-xs text-kc-muted">{group.hint}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {presets.map((preset) => {
                      const disabled =
                        !presetCtx ||
                        (preset.disabled?.(presetCtx) ?? false);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={disabled || busyId !== null}
                          onClick={() => void applyPreset(preset)}
                          className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${TONE_STYLES[preset.tone]}`}
                        >
                          <span className="block font-medium text-kc-fg">
                            {busyId === preset.id
                              ? "Đang áp dụng…"
                              : preset.title}
                          </span>
                          <span className="mt-1 block text-xs text-kc-muted">
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
    )}

    {controlMethod === "pp2" && (
    <section className="space-y-6">
      <p className="rounded-lg border border-kc-border bg-kc-bg/60 px-3 py-2 text-xs text-kc-muted">
        Ramp ±% tùy chọn — dùng <strong className="text-violet-300">Bàn điều khiển nhanh</strong>.
        Dưới đây: mô hình đặc biệt (GBM, V-shape, OU, …).{" "}
        <code className="text-xs">docs/MARKET_CONTROL_MODELS.md</code>
      </p>
      {MODEL_PRESET_GROUPS.map((group) => {
        const presets = PRICE_MODEL_PRESETS.filter((p) => {
          if (
            p.id === "model-pump-ramp" ||
            p.id === "model-dump-ramp" ||
            p.id === "model-sideway-sin"
          ) {
            return false;
          }
          if (group.id === "trend") {
            return ["linear_ramp", "exp_trend", "step_ladder"].includes(
              p.modelId
            );
          }
          if (group.id === "oscillate") {
            return ["sin_band", "mean_reversion", "gbm"].includes(
              p.modelId
            );
          }
          return p.modelId === "triangle";
        });
        return (
          <div key={group.id}>
            <div className="mb-2">
              <h2 className="text-base font-semibold">{group.label}</h2>
              <p className="text-xs text-kc-muted">{group.hint}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={!selected || busyId !== null}
                  onClick={() => void applyModelPreset(preset)}
                  className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${TONE_STYLES[preset.tone]}`}
                >
                  <span className="block font-medium text-kc-fg">
                    {busyId === preset.id ? "Đang chạy…" : preset.title}
                  </span>
                  <span className="mt-1 block text-xs text-kc-muted">
                    {preset.desc}
                  </span>
                  <span className="mt-2 block text-[10px] uppercase tracking-wide text-kc-muted">
                    {preset.modelId} · {preset.durationMin} phút
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
    )}
    </AdminSection>
  );
}
