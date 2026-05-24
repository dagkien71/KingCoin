"use client";

import { Button } from "@/components/ui/button";
import { targetLabel, type ApplyTarget } from "@/modules/admin/market-control-target";
import {
  buildScenarioRunPlan,
  clampDurationMin,
  clampPct,
  DURATION_PRESETS,
  PCT_PRESETS,
  previewScenarioPrices,
  scenarioKindLabel,
  scenarioUsesDuration,
  type ScenarioConfig,
  type ScenarioKind,
} from "@/modules/admin/market-scenario";
import { TokenIdentity } from "@/components/token/TokenLogo";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

const STORAGE_KEY = "kc-mm-scenario-v1";

type SavedPrefs = Pick<ScenarioConfig, "kind" | "pct" | "durationMin" | "restoreOnEnd">;

function loadPrefs(): SavedPrefs {
  if (typeof window === "undefined") {
    return { kind: "pump", pct: 5, durationMin: 10, restoreOnEnd: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { kind: "pump", pct: 5, durationMin: 10, restoreOnEnd: false };
    const p = JSON.parse(raw) as SavedPrefs;
    return {
      kind: p.kind ?? "pump",
      pct: clampPct(Number(p.pct) || 5),
      durationMin: clampDurationMin(Number(p.durationMin) || 10),
      restoreOnEnd: p.restoreOnEnd === true,
    };
  } catch {
    return { kind: "pump", pct: 5, durationMin: 10, restoreOnEnd: false };
  }
}

type Props = {
  applyTarget: ApplyTarget;
  tokenId: string;
  altCount: number;
  groupCount: number;
  refSpot: number;
  refSymbol: string;
  refLogo?: string | null;
  nudgeDisabled: boolean;
  pathBlocked: boolean;
  busy: boolean;
  onBusyChange: (v: boolean) => void;
  postAction: (body: unknown, path: string) => Promise<unknown>;
  onDone: () => void | Promise<unknown>;
};

const KINDS: { id: ScenarioKind; label: string; tone: string }[] = [
  { id: "pump", label: "Pump ▲", tone: "text-kc-up border-kc-up/40 bg-kc-up/10" },
  { id: "dump", label: "Dump ▼", tone: "text-kc-down border-kc-down/40 bg-kc-down/10" },
  {
    id: "sideway",
    label: "Sideway ↔",
    tone: "text-kc-accent border-kc-accent/40 bg-kc-accent/10",
  },
  {
    id: "nudge_up",
    label: "+% ngay",
    tone: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10",
  },
  {
    id: "nudge_down",
    label: "−% ngay",
    tone: "text-rose-300 border-rose-500/40 bg-rose-500/10",
  },
];

function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1.5 text-sm font-medium transition",
        active
          ? "border-violet-400 bg-violet-500/25 text-violet-100"
          : "border-kc-border bg-kc-bg text-kc-muted hover:border-kc-border-strong hover:text-kc-fg",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function ScenarioLauncher({
  applyTarget,
  tokenId,
  altCount,
  groupCount,
  refSpot,
  refSymbol,
  refLogo,
  nudgeDisabled,
  pathBlocked,
  busy,
  onBusyChange,
  postAction,
  onDone,
}: Props) {
  const [prefs, setPrefs] = useState<SavedPrefs>(loadPrefs);
  const [customPct, setCustomPct] = useState("");
  const [customMin, setCustomMin] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const config: ScenarioConfig = useMemo(
    () => ({
      kind: prefs.kind,
      pct: prefs.pct,
      durationMin: prefs.durationMin,
      restoreOnEnd: prefs.restoreOnEnd,
    }),
    [prefs]
  );

  const preview = useMemo(
    () => previewScenarioPrices(refSpot, config),
    [refSpot, config]
  );

  const targetSummary = targetLabel(
    applyTarget.mode,
    groupCount,
    altCount
  );

  const nudgeBlocked =
    (prefs.kind === "nudge_up" || prefs.kind === "nudge_down") &&
    (nudgeDisabled || applyTarget.mode !== "single");

  const runDisabled = busy || pathBlocked || nudgeBlocked;

  const applyPct = (v: number) => {
    setPrefs((p) => ({ ...p, pct: clampPct(v) }));
    setCustomPct("");
  };

  const applyDuration = (v: number) => {
    setPrefs((p) => ({ ...p, durationMin: clampDurationMin(v) }));
    setCustomMin("");
  };

  const run = useCallback(async () => {
    if (applyTarget.mode === "single" && !tokenId) return;
    if (applyTarget.mode === "group" && applyTarget.tokenIds.length === 0) {
      return;
    }

    const plan = buildScenarioRunPlan(
      config,
      refSpot,
      applyTarget,
      tokenId
    );

    const msg = `${scenarioKindLabel(config.kind)} ${config.pct}%${
      scenarioUsesDuration(config.kind) ? ` · ${config.durationMin}p` : ""
    } → ${targetSummary}?`;

    if (!window.confirm(msg)) return;

    onBusyChange(true);
    try {
      if (plan.mode === "single") {
        await postAction(plan.body, plan.path);
        if (plan.refreshPath) {
          await postAction({}, plan.refreshPath);
        }
      } else {
        await postAction(plan.body, plan.path);
        if (plan.refreshAfter === "all") {
          await postAction({}, "/admin/market-control/refresh");
        }
      }
      await onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Không chạy được kịch bản";
      toast.error(msg);
    } finally {
      onBusyChange(false);
    }
  }, [
    applyTarget,
    config,
    refSpot,
    tokenId,
    targetSummary,
    onBusyChange,
    postAction,
    onDone,
  ]);

  return (
    <section className="rounded-xl border border-violet-500/40 bg-gradient-to-br from-violet-500/10 via-kc-surface to-kc-surface p-4 shadow-kc">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-kc-fg">
            Bàn điều khiển nhanh
          </h2>
          <p className="mt-1 max-w-xl text-xs text-kc-muted">
            Chọn loại, % và thời gian — áp dụng cho{" "}
            <strong className="text-violet-200">{targetSummary}</strong>
            {applyTarget.mode === "single"
              ? " (mã đã chọn ở khối phạm vi phía trên)"
              : ""}
            .
            Pump/Dump/Sideway dùng PP2; ±% ngay chỉ một mã.
          </p>
        </div>
        <div className="rounded-lg border border-kc-border bg-kc-bg/80 px-3 py-2 text-xs">
          <TokenIdentity
            logo={refLogo}
            symbol={refSymbol}
            size="sm"
            className="mb-1"
          />
          <div className="num text-right text-sm font-medium text-kc-fg">
            {preview.from} → {preview.to}
          </div>
          <div className="text-right text-violet-300">{preview.toLabel}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[10px] font-medium uppercase tracking-wide text-kc-muted">
          Loại kịch bản
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, kind: k.id }))}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition",
                prefs.kind === k.id
                  ? k.tone
                  : "border-kc-border text-kc-muted hover:text-kc-fg"
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-kc-muted">
            Biên độ %
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PCT_PRESETS.map((n) => (
              <Chip
                key={n}
                active={prefs.pct === n && !customPct}
                onClick={() => applyPct(n)}
              >
                {n}%
              </Chip>
            ))}
          </div>
          <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-kc-muted">
            Tùy chỉnh (không giới hạn trần)
            <input
              type="number"
              min={0.01}
              step={0.1}
              placeholder="%"
              className="num w-20 rounded-lg border border-kc-border bg-kc-bg px-2 py-1 text-sm text-kc-fg"
              value={customPct}
              onChange={(e) => setCustomPct(e.target.value)}
              onBlur={() => {
                const v = parseFloat(customPct);
                if (Number.isFinite(v)) applyPct(v);
              }}
            />
          </label>
        </div>

        {scenarioUsesDuration(prefs.kind) ? (
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-kc-muted">
              Thời lượng
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((n) => (
                <Chip
                  key={n}
                  active={prefs.durationMin === n && !customMin}
                  onClick={() => applyDuration(n)}
                >
                  {n}p
                </Chip>
              ))}
            </div>
            <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-kc-muted">
              Tùy chỉnh (phút, không giới hạn trần)
              <input
                type="number"
                min={1}
                step={1}
                placeholder="phút"
                className="num w-20 rounded-lg border border-kc-border bg-kc-bg px-2 py-1 text-sm text-kc-fg"
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                onBlur={() => {
                  const v = parseFloat(customMin);
                  if (Number.isFinite(v)) applyDuration(v);
                }}
              />
            </label>
          </div>
        ) : (
          <div className="flex items-end">
            <p className="text-xs text-kc-muted">
              ±% ngay: đổi spot tức thì, không cần chọn thời lượng.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-kc-muted">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-kc-border"
            checked={prefs.restoreOnEnd}
            disabled={!scenarioUsesDuration(prefs.kind)}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, restoreOnEnd: e.target.checked }))
            }
          />
          Khôi phục giá sau khi xong (hồi dần ~1–2 phút)
        </label>
        <span className="text-xs text-kc-muted">
          Công thức:{" "}
          {prefs.kind === "pump" || prefs.kind === "dump"
            ? "linear_ramp (PP2)"
            : prefs.kind === "sideway"
              ? "sin_band (PP2)"
              : "nudge spot"}
        </span>
      </div>

      {nudgeBlocked && (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          ±% ngay: chuyển phạm vi sang <strong>Một mã</strong> và chọn token
          (không áp dụng nhóm / tất cả alt).
        </p>
      )}
      {pathBlocked && (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Mã đang có setup đường giá — hủy trong bảng «Setup đang chạy» trước
          khi chạy kịch bản mới (một mã), hoặc dùng nhóm để ghi đè từng mã.
        </p>
      )}

      <Button
        type="button"
        variant="primary"
        size="lg"
        className="mt-4 w-full bg-violet-600 hover:bg-violet-500 sm:w-auto sm:min-w-[240px]"
        disabled={runDisabled}
        onClick={() => void run()}
      >
        {busy
          ? "Đang chạy…"
          : `Chạy — ${scenarioKindLabel(prefs.kind)} ${prefs.pct}%${
              scenarioUsesDuration(prefs.kind)
                ? ` · ${prefs.durationMin} phút`
                : ""
            }`}
      </Button>
    </section>
  );
}
