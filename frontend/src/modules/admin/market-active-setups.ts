import { filterAlts } from "@/modules/admin/market-control-target";

export type ActiveSetupKind = "pp1" | "pp2";

export type ActiveSetupRow = {
  tokenId: string;
  name: string;
  symbol: string;
  logo?: string | null;
  kind: ActiveSetupKind;
  status: string;
  label: string;
  detail: string;
  startAt: number;
  endAt: number;
  progress: number;
  currentTarget: number | null;
};

type TokenWithPaths = {
  id: string;
  name: string;
  symbol: string;
  logo?: string | null;
  schedule: {
    startAt: number;
    endAt: number;
    priceMin: number;
    priceMax: number;
    status: string;
    progress: number;
    currentTarget: number | null;
    isActive: boolean;
  } | null;
  modelRun: {
    modelId: string;
    startAt: number;
    endAt: number;
    status: string;
    progress: number;
    currentTarget: number | null;
    isActive: boolean;
  } | null;
};

const MODEL_LABELS: Record<string, string> = {
  sin_band: "Sóng sin (sideway)",
  linear_ramp: "Ramp tuyến tính",
  mean_reversion: "Hồi quy về spot",
  gbm: "GBM demo",
  step_ladder: "Bậc thang",
  triangle: "V-shape",
  exp_trend: "Xu hướng mũ",
};

function isPathStillLive(
  endAt: number,
  status: string,
  now = Date.now()
): boolean {
  if (endAt <= now) return false;
  return status !== "cancelled" && status !== "ended";
}

/** Gom mọi lịch PP1 / mô hình PP2 còn hiệu lực (kể cả chờ bắt đầu). */
export function collectActiveSetups(
  tokens: TokenWithPaths[],
  now = Date.now()
): ActiveSetupRow[] {
  const rows: ActiveSetupRow[] = [];

  for (const t of filterAlts(tokens)) {
    const run = t.modelRun;
    if (run && isPathStillLive(run.endAt, run.status, now)) {
      rows.push({
        tokenId: t.id,
        name: t.name,
        symbol: t.symbol,
        logo: t.logo,
        kind: "pp2",
        status: run.status,
        label: MODEL_LABELS[run.modelId] ?? run.modelId,
        detail: run.modelId,
        startAt: run.startAt,
        endAt: run.endAt,
        progress: run.progress ?? 0,
        currentTarget: run.currentTarget,
      });
      continue;
    }

    const sched = t.schedule;
    if (sched && isPathStillLive(sched.endAt, sched.status, now)) {
      rows.push({
        tokenId: t.id,
        name: t.name,
        symbol: t.symbol,
        logo: t.logo,
        kind: "pp1",
        status: sched.status,
        label: "Lịch sóng sin",
        detail: `[${sched.priceMin} – ${sched.priceMax}]`,
        startAt: sched.startAt,
        endAt: sched.endAt,
        progress: sched.progress ?? 0,
        currentTarget: sched.currentTarget,
      });
    }
  }

  return rows.sort((a, b) => a.endAt - b.endAt);
}

export function formatSetupTime(ms: number): string {
  return new Date(ms).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSetupRemaining(ms: number): string {
  if (ms <= 0) return "Sắp kết thúc";
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin < 60) return `${totalMin} phút`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}p` : `${h}h`;
}
