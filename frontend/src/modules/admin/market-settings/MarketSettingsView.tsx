"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStatCard } from "@/modules/admin/AdminStatCard";
import { ADMIN_TAGLINE } from "@/modules/admin/constants";
import type {
  EffectiveLiquiditySettings,
  LiquiditySettingsSource,
} from "@/modules/admin/market-settings/market-settings-types";
import {
  clampMarketSettings,
  validateMarketSettings,
} from "@/modules/admin/market-settings/market-settings-limits";
import { NORMAL_STEADY_PRESET } from "@/modules/admin/market-settings/market-settings-presets";
import { useMarketSettings } from "@/modules/admin/market-settings/useMarketSettings";
import { VolatilitySlider } from "@/modules/admin/market-settings/VolatilitySlider";
import {
  inferVolatilityLevel,
  type VolatilityLevelId,
} from "@/modules/admin/market-settings/volatility-presets";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { HiOutlineChip, HiOutlineTrendingUp } from "react-icons/hi";

function SourceBadge({ source }: { source?: LiquiditySettingsSource }) {
  if (!source) return null;
  return (
    <span
      className={
        source === "db"
          ? "rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200"
          : "rounded bg-kc-surface px-1.5 py-0.5 text-[10px] text-kc-muted"
      }
    >
      {source === "db" ? "DB" : "env"}
    </span>
  );
}

function ToggleRow({
  label,
  hint,
  on,
  source,
  onToggle,
}: {
  label: string;
  hint?: string;
  on: boolean;
  source?: LiquiditySettingsSource;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-kc-border/60 py-3 last:border-0">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-kc-fg">{label}</p>
          <SourceBadge source={source} />
        </div>
        {hint ? <p className="mt-0.5 text-xs text-kc-muted">{hint}</p> : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={on ? "primary" : "secondary"}
        onClick={() => onToggle(!on)}
      >
        {on ? "Bật" : "Tắt"}
      </Button>
    </div>
  );
}

function NumField({
  label,
  hint,
  value,
  source,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  source?: LiquiditySettingsSource;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm text-kc-fg">{label}</label>
        <SourceBadge source={source} />
      </div>
      {hint ? <p className="text-xs text-kc-muted">{hint}</p> : null}
      <Input
        type="number"
        min={min}
        max={max}
        step={step ?? (Number.isInteger(value) ? 1 : 0.001)}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
      />
    </div>
  );
}

export function MarketSettingsView() {
  const {
    data,
    loading,
    error,
    saving,
    resetting,
    applyingPreset,
    save,
    resetToEnv,
    applyNormalSteady,
    applyVolatility,
    refetch,
  } = useMarketSettings();
  const [form, setForm] = useState<EffectiveLiquiditySettings | null>(null);
  /** Tránh poll 5s ghi đè ô đang gõ */
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.effective && !dirty) {
      setForm(clampMarketSettings(data.effective));
    }
  }, [data, dirty]);

  const set = <K extends keyof EffectiveLiquiditySettings>(
    key: K,
    value: EffectiveLiquiditySettings[K]
  ) => {
    setDirty(true);
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    const payload = clampMarketSettings(form!);
    const err = validateMarketSettings(payload);
    if (err) {
      toast.error(err);
      setForm(payload);
      return;
    }
    const ok = await save(payload);
    if (ok) setDirty(false);
  };

  const handleResetEnv = async () => {
    const ok = await resetToEnv();
    if (ok) setDirty(false);
  };

  const handleApplyNormalSteady = async () => {
    const ok = await applyNormalSteady();
    if (ok) {
      setDirty(false);
      setForm(clampMarketSettings(NORMAL_STEADY_PRESET));
    }
  };

  const handleRefresh = () => {
    setDirty(false);
    void refetch();
  };

  const sources = data?.sources;
  const volatilityLevel: VolatilityLevelId =
    data?.currentVolatilityLevel ??
    (form ? inferVolatilityLevel(form.oscillatePct) : "stable");

  const handleVolatilityChange = async (level: VolatilityLevelId) => {
    const ok = await applyVolatility(level);
    if (ok) {
      setDirty(false);
    }
  };

  if (!form && loading) {
    return <p className="text-sm text-kc-muted">Đang tải cài đặt…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-kc-down">
        Không tải được cài đặt — đăng nhập admin.
      </p>
    );
  }

  if (!form) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-violet-400/90">
            Cài đặt hệ thống
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-kc-fg">
            Thanh khoản &amp; MM
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-kc-muted">{ADMIN_TAGLINE}</p>
          <p className="mt-2 text-xs text-kc-muted">
            Thay cho chỉnh env trên Render — lưu DB, áp dụng ngay (tốc độ, biên
            độ, số bot). Env vẫn là mặc định khi chưa ghi đè.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={applyingPreset || saving}
            onClick={() => void handleApplyNormalSteady()}
            title="Sổ 500ms, flow vừa, giá dao ±~0.1%"
          >
            {applyingPreset ? "Đang áp…" : "Preset ±0.1%"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading}
            onClick={handleRefresh}
          >
            Làm mới
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={resetting}
            onClick={() => void handleResetEnv()}
          >
            Về env
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Đang lưu…" : "Lưu & áp dụng"}
          </Button>
        </div>
      </header>

      <Card className="border-violet-500/25 bg-violet-500/5">
        <CardHeader>
          <CardTitle className="text-base">Điều khiển biến động</CardTitle>
          <p className="text-xs text-kc-muted">
            Một thanh thay cho chỉnh từng ô oscillate / wander / jitter. Chi tiết
            nâng cao ở các khối bên dưới.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <VolatilitySlider
            value={volatilityLevel}
            disabled={applyingPreset || saving}
            onChange={(level) => void handleVolatilityChange(level)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="MM runtime"
          value={form.mmEnabled ? "Bật" : "Tắt"}
          tone={form.mmEnabled ? "success" : "muted"}
        />
        <AdminStatCard
          label="Flow runtime"
          value={form.flowEnabled ? "Bật" : "Tắt"}
          tone={form.flowEnabled ? "success" : "muted"}
        />
        <AdminStatCard
          label="Chu kỳ MM"
          value={`${form.mmIntervalMs} ms`}
          hint={`Flow ${form.flowIntervalMs} ms`}
        />
        <AdminStatCard
          label="Bot bật"
          value={`${form.mmBotCount} MM · ${form.flowBotCount} flow`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/market-control">
          <Button type="button" variant="ghost" size="sm" className="gap-1.5">
            <HiOutlineTrendingUp className="h-4 w-4" />
            Điều khiển giá
          </Button>
        </Link>
        <Link href="/admin/mm-bots">
          <Button type="button" variant="ghost" size="sm" className="gap-1.5">
            <HiOutlineChip className="h-4 w-4" />
            Chi tiết từng bot
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bật / tắt</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ToggleRow
              label="Market Maker"
              hint="Treo sổ hai phía"
              on={form.mmEnabled}
              source={sources?.mmEnabled}
              onToggle={(v) => {
                set("mmEnabled", v);
                if (!v) set("flowEnabled", false);
              }}
            />
            <ToggleRow
              label="Flow taker"
              hint="Khớp liên tục với sổ MM"
              on={form.flowEnabled}
              source={sources?.flowEnabled}
              onToggle={(v) => set("flowEnabled", v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tốc độ giao dịch</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
            <NumField
              label="Chu kỳ MM (ms)"
              hint="Nhỏ = refresh sổ nhanh (min 500)"
              value={form.mmIntervalMs}
              source={sources?.mmIntervalMs}
              min={500}
              max={60000}
              onChange={(v) => set("mmIntervalMs", v)}
            />
            <NumField
              label="Chu kỳ Flow (ms)"
              hint="Nhỏ = khớp nhanh hơn (min 300)"
              value={form.flowIntervalMs}
              source={sources?.flowIntervalMs}
              min={300}
              max={60000}
              onChange={(v) => set("flowIntervalMs", v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Số bot hoạt động</CardTitle>
            <p className="text-xs text-kc-muted">
              Trong pool email env (mm1…, flow1…). Tạo thêm bot: bootstrap trên
              Render hoặc /admin/mm-bots.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
            <NumField
              label="Bot MM bật"
              value={form.mmBotCount}
              source={sources?.mmBotCount}
              min={0}
              max={32}
              onChange={(v) => set("mmBotCount", v)}
            />
            <NumField
              label="Bot Flow bật"
              value={form.flowBotCount}
              source={sources?.flowBotCount}
              min={0}
              max={16}
              onChange={(v) => set("flowBotCount", v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Biên độ &amp; khối lượng sổ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-0 sm:grid-cols-2">
            <NumField
              label="Bậc sổ (levels)"
              value={form.levels}
              source={sources?.levels}
              min={1}
              max={12}
              onChange={(v) => set("levels", v)}
            />
            <NumField
              label="Spread step"
              hint="Tỷ lệ mỗi bậc (vd 0.0025 ≈ 0,25%). Tối đa 0,2 (20%)."
              value={form.spreadStep}
              source={sources?.spreadStep}
              min={0.0001}
              max={0.2}
              step={0.0001}
              onChange={(v) => set("spreadStep", v)}
            />
            <NumField
              label="Qty MM / bậc"
              value={form.qty}
              source={sources?.qty}
              min={1}
              onChange={(v) => set("qty", v)}
            />
            <NumField
              label="Qty Flow / lượt"
              value={form.flowQty}
              source={sources?.flowQty}
              min={1}
              onChange={(v) => set("flowQty", v)}
            />
            <NumField
              label="Oscillate %"
              hint="Dao động mid"
              value={form.oscillatePct}
              source={sources?.oscillatePct}
              min={0}
              max={0.05}
              step={0.001}
              onChange={(v) => set("oscillatePct", v)}
            />
            <NumField
              label="Wander %"
              value={form.wanderPct}
              source={sources?.wanderPct}
              min={0}
              max={0.02}
              step={0.001}
              onChange={(v) => set("wanderPct", v)}
            />
            <NumField
              label="Level jitter %"
              value={form.levelJitterPct}
              source={sources?.levelJitterPct}
              min={0}
              max={0.02}
              step={0.0001}
              onChange={(v) => set("levelJitterPct", v)}
            />
            <NumField
              label="Multi-bot mid step"
              hint="Phân tán giá giữa nhiều bot MM"
              value={form.multiMidStep}
              source={sources?.multiMidStep}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => set("multiMidStep", v)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
