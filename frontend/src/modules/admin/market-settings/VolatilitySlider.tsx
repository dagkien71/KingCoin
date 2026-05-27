"use client";

import type { VolatilityLevelId } from "@/modules/admin/market-settings/volatility-presets";
import { VOLATILITY_LEVELS } from "@/modules/admin/market-settings/volatility-presets";
import { cn } from "@/lib/cn";

type Props = {
  value: VolatilityLevelId;
  disabled?: boolean;
  onChange: (level: VolatilityLevelId) => void;
};

export function VolatilitySlider({ value, disabled, onChange }: Props) {
  const index = Math.max(
    0,
    VOLATILITY_LEVELS.findIndex((l) => l.id === value)
  );
  const current = VOLATILITY_LEVELS[index] ?? VOLATILITY_LEVELS[2];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-kc-fg">Mức biến động giá</p>
        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-sm font-semibold text-violet-200">
          {current.labelVi}
        </span>
      </div>
      <p className="text-xs text-kc-muted">{current.hintVi}</p>

      <input
        type="range"
        aria-label="Mức biến động giá"
        min={0}
        max={VOLATILITY_LEVELS.length - 1}
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
          const level = VOLATILITY_LEVELS[i];
          if (level) onChange(level.id);
        }}
      />

      <div className="flex justify-between gap-1 text-[10px] sm:text-xs">
        {VOLATILITY_LEVELS.map((l, i) => (
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

      <p className="text-[11px] text-kc-muted">
        Kéo thanh hoặc chạm nhãn — lưu ngay xuống DB và áp dụng MM/flow (oscillate
        ~{(current.oscillatePct * 100).toFixed(2)}% mỗi nhịp).
      </p>
    </div>
  );
}
