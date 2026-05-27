"use client";

import type {
  EffectiveLiquiditySettings,
  VolatilityLevelId,
  VolatilityLevelMeta,
  VolatilityProfileApi,
} from "@/modules/admin/market-settings/market-settings-types";
import {
  VOLATILITY_LEVEL_LABELS,
  VOLATILITY_LEVEL_ORDER,
  volatilityLevelIndex,
} from "@/modules/admin/market-settings/volatility-presets";
import { cn } from "@/lib/cn";

type Props = {
  value: VolatilityLevelId;
  disabled?: boolean;
  levels?: VolatilityLevelMeta[];
  profiles?: VolatilityProfileApi[];
  effective?: EffectiveLiquiditySettings;
  ramping?: boolean;
  onChange: (level: VolatilityLevelId) => void;
};

function resolveLevels(levels?: VolatilityLevelMeta[]): VolatilityLevelMeta[] {
  if (levels?.length) return levels;
  return VOLATILITY_LEVEL_ORDER.map((id) => ({
    id,
    labelVi: VOLATILITY_LEVEL_LABELS[id],
    hintVi: "",
    oscillatePct: 0,
    frequencyHintVi: "",
    volumeHintVi: "",
    matchHintVi: "",
    priceHintVi: "",
  }));
}

export function VolatilitySlider({
  value,
  disabled,
  levels: levelsProp,
  profiles,
  effective,
  ramping,
  onChange,
}: Props) {
  const levels = resolveLevels(levelsProp);
  const index = Math.max(0, volatilityLevelIndex(value));
  const current = levels[index] ?? levels[2];
  const profile =
    profiles?.find((p) => p.level === current.id) ??
    profiles?.find((p) => p.level === value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-kc-fg">Cường độ thị trường</p>
        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-sm font-semibold text-violet-200">
          {current.labelVi}
          {ramping ? " · đang chuyển" : ""}
        </span>
      </div>
      <p className="text-xs text-kc-muted">{current.hintVi || profile?.hintVi}</p>

      {(profile || current.frequencyHintVi) && (
        <ul className="grid gap-1.5 rounded-lg border border-kc-border/80 bg-kc-bg/40 p-3 text-[11px] text-kc-muted sm:grid-cols-2">
          <li>
            <span className="font-medium text-kc-fg">Tần suất: </span>
            {profile?.frequencyHintVi ?? current.frequencyHintVi}
          </li>
          <li>
            <span className="font-medium text-kc-fg">Volume: </span>
            {profile?.volumeHintVi ?? current.volumeHintVi}
          </li>
          <li>
            <span className="font-medium text-kc-fg">Khớp lệnh: </span>
            {profile?.matchHintVi ?? current.matchHintVi}
          </li>
          <li>
            <span className="font-medium text-kc-fg">Giá: </span>
            {profile?.priceHintVi ?? current.priceHintVi}
          </li>
        </ul>
      )}

      <input
        type="range"
        aria-label="Cường độ thị trường"
        min={0}
        max={levels.length - 1}
        step={1}
        value={index}
        disabled={disabled}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full bg-kc-border",
          "accent-violet-500 disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-400",
          "[&::-webkit-slider-thumb]:shadow-md"
        )}
        onChange={(e) => {
          const i = Number(e.target.value);
          const level = levels[i];
          if (level) onChange(level.id);
        }}
      />

      <div className="flex justify-between gap-1 text-[10px] sm:text-xs">
        {levels.map((l, i) => (
          <button
            key={l.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(l.id)}
            className={cn(
              "flex-1 rounded px-0.5 py-1 text-center transition-colors",
              i === index
                ? "font-semibold text-violet-300"
                : "text-kc-muted hover:text-kc-fg"
            )}
          >
            {l.labelVi}
          </button>
        ))}
      </div>

      {effective && (
        <p className="text-[11px] text-kc-muted">
          Runtime: MM {effective.mmIntervalMs}ms · Flow {effective.flowIntervalMs}
          ms · flowQty {effective.flowQty} · sổ qty≈{effective.qty} — lưu DB, áp dụng
          ngay (giá từ khớp lệnh).
        </p>
      )}
    </div>
  );
}
