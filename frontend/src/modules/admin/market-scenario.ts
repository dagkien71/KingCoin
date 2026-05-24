import type { ApplyTarget } from "@/modules/admin/market-control-target";
import { bulkTargetBody } from "@/modules/admin/market-control-target";
import type { PriceModelId } from "@/modules/admin/market-model-presets";

/** % biên độ — chip nhanh cho nhà cái */
export const PCT_PRESETS = [1, 2, 3, 5, 7, 10, 15, 20] as const;

/** Thời lượng (phút) */
export const DURATION_PRESETS = [5, 10, 15, 20, 30, 45, 60] as const;

export type ScenarioKind = "pump" | "dump" | "sideway" | "nudge_up" | "nudge_down";

export type ScenarioConfig = {
  kind: ScenarioKind;
  /** Biên độ % (vd 5 = ±5% hoặc +5%/-5%) */
  pct: number;
  /** Phút — bỏ qua với nudge */
  durationMin: number;
  restoreOnEnd: boolean;
};

/** Chỉ đảm bảo số hợp lệ — không giới hạn trần % (nhà cái tự nhập). */
export function clampPct(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0.01;
  return pct;
}

/** Phút tối thiểu 1 (server yêu cầu span ≥ 30s). Không giới hạn trần. */
export function clampDurationMin(min: number): number {
  if (!Number.isFinite(min) || min < 1) return 1;
  return Math.round(min);
}

export function scenarioKindLabel(kind: ScenarioKind): string {
  switch (kind) {
    case "pump":
      return "Pump (ramp lên)";
    case "dump":
      return "Dump (ramp xuống)";
    case "sideway":
      return "Sideway (sóng sin)";
    case "nudge_up":
      return "+% ngay";
    case "nudge_down":
      return "−% ngay";
  }
}

export function scenarioUsesDuration(kind: ScenarioKind): boolean {
  return kind !== "nudge_up" && kind !== "nudge_down";
}

/** Xem trước giá đích (một mã tham chiếu). */
export function previewScenarioPrices(
  spot: number,
  config: ScenarioConfig
): { from: number; to: number; toLabel: string } {
  const p = spot > 0 ? spot : 1;
  const pct = clampPct(config.pct);
  const ratio = pct / 100;

  switch (config.kind) {
    case "pump": {
      const to = Number((p * (1 + ratio)).toFixed(8));
      return { from: p, to, toLabel: `+${pct}%` };
    }
    case "dump": {
      const to = Number((p * (1 - ratio)).toFixed(8));
      return { from: p, to, toLabel: `−${pct}%` };
    }
    case "sideway":
      return {
        from: p,
        to: p,
        toLabel: `±${pct}% (min ${Number((p * (1 - ratio)).toFixed(4))} – max ${Number((p * (1 + ratio)).toFixed(4))})`,
      };
    case "nudge_up": {
      const to = Number((p * (1 + ratio)).toFixed(8));
      return { from: p, to, toLabel: `+${pct}% tức thì` };
    }
    case "nudge_down": {
      const to = Number((p * (1 - ratio)).toFixed(8));
      return { from: p, to, toLabel: `−${pct}% tức thì` };
    }
  }
}

function rampParams(spot: number, pct: number, up: boolean) {
  const p = spot > 0 ? spot : 1;
  const ratio = clampPct(pct) / 100;
  const mult = up ? 1 + ratio : 1 - ratio;
  return {
    priceStart: p,
    priceEnd: Number((p * mult).toFixed(8)),
  };
}

function sinBandParams(spot: number, pct: number, durationMin: number) {
  const p = spot > 0 ? spot : 1;
  const band = clampPct(pct) / 100;
  const waves = Math.max(2, Math.min(12, Math.round(durationMin / 4)));
  return {
    priceStart: p,
    priceMin: Number((p * (1 - band)).toFixed(8)),
    priceMax: Number((p * (1 + band)).toFixed(8)),
    waveCycles: waves,
  };
}

export type ScenarioRunPlan =
  | {
      mode: "single";
      path: string;
      body: Record<string, unknown>;
      refreshPath?: string;
    }
  | {
      mode: "bulk";
      path: string;
      body: Record<string, unknown>;
      refreshAfter: "all" | "none";
    };

/** Kế hoạch gọi API — pump/dump/sideway qua PP2; nudge chỉ một mã. */
export function buildScenarioRunPlan(
  config: ScenarioConfig,
  spot: number,
  applyTarget: ApplyTarget,
  tokenId: string
): ScenarioRunPlan {
  const pct = clampPct(config.pct);
  const durationMin = clampDurationMin(config.durationMin);

  if (config.kind === "nudge_up" || config.kind === "nudge_down") {
    if (applyTarget.mode !== "single") {
      throw new Error("±% ngay chỉ áp dụng cho một mã");
    }
    return {
      mode: "single",
      path: `/admin/market-control/tokens/${tokenId}/nudge`,
      body: {
        direction: config.kind === "nudge_up" ? "up" : "down",
        pct: pct / 100,
      },
      refreshPath: `/admin/market-control/tokens/${tokenId}/refresh`,
    };
  }

  const bulk = applyTarget.mode !== "single";
  const target = bulk ? bulkTargetBody(applyTarget) : undefined;

  if (config.kind === "pump" || config.kind === "dump") {
    const modelId: PriceModelId = "linear_ramp";
    const params = rampParams(spot, pct, config.kind === "pump");
    const body = {
      ...(target ?? {}),
      modelId,
      durationMin,
      params,
      restoreOnEnd: config.restoreOnEnd,
    };
    if (bulk) {
      return {
        mode: "bulk",
        path: "/admin/market-control/bulk/model-run",
        body,
        refreshAfter: "all",
      };
    }
    return {
      mode: "single",
      path: `/admin/market-control/tokens/${tokenId}/model-run`,
      body,
      refreshPath: `/admin/market-control/tokens/${tokenId}/refresh`,
    };
  }

  // Sideway — sin_band PP2 (bulk + single đều ổn)
  const modelId: PriceModelId = "sin_band";
  const params = sinBandParams(spot, pct, durationMin);
  const body = {
    ...(target ?? {}),
    modelId,
    durationMin,
    params,
    restoreOnEnd: config.restoreOnEnd,
  };
  if (bulk) {
    return {
      mode: "bulk",
      path: "/admin/market-control/bulk/model-run",
      body,
      refreshAfter: "all",
    };
  }
  return {
    mode: "single",
    path: `/admin/market-control/tokens/${tokenId}/model-run`,
    body,
    refreshPath: `/admin/market-control/tokens/${tokenId}/refresh`,
  };
}
