export type PresetGroup = "schedule" | "instant" | "system" | "book";

/** token = chỉ mã đang chọn; global = cả sàn / mọi token MM */
export type PresetScope = "token" | "global";

import type { ApplyTarget } from "@/modules/admin/market-control-target";
import { bulkTargetBody } from "@/modules/admin/market-control-target";
import {
  buildModelRunBody,
  PRICE_MODEL_PRESETS,
} from "@/modules/admin/market-model-presets";

export type PresetContext = {
  tokenId: string;
  price: number;
  hasSchedule: boolean;
  hasModelRun: boolean;
  mmEnabled: boolean;
  flowEnabled: boolean;
  applyTarget: ApplyTarget;
  post: (body: unknown, path: string) => Promise<unknown>;
  postBulk: (body: unknown, path: string) => Promise<unknown>;
  patchBulk: (body: unknown, path: string) => Promise<unknown>;
  patchGlobal: (body: unknown) => Promise<unknown>;
  patchToken: (body: unknown, path: string) => Promise<unknown>;
};

export type MarketPreset = {
  id: string;
  group: PresetGroup;
  scope: PresetScope;
  title: string;
  desc: string;
  tone: "up" | "down" | "neutral" | "warn" | "accent";
  disabled?: (ctx: PresetContext) => boolean;
  run: (ctx: PresetContext) => Promise<unknown>;
};

function patchTokenBook(
  ctx: PresetContext,
  spreadStep: number,
  levels: number,
) {
  if (ctx.applyTarget.mode !== "single") {
    return ctx.patchBulk(
      { ...bulkTargetBody(ctx.applyTarget), spreadStep, levels },
      "/admin/market-control/bulk/tokens"
    );
  }
  return ctx.patchToken(
    { spreadStep, levels },
    `/admin/market-control/tokens/${ctx.tokenId}`
  );
}

function schedule(
  ctx: PresetContext,
  minutes: number,
  minRatio: number,
  maxRatio: number,
  waveCycles: number,
) {
  if (ctx.applyTarget.mode !== "single") {
    return ctx.postBulk(
      {
        ...bulkTargetBody(ctx.applyTarget),
        minutes,
        minRatio,
        maxRatio,
        waveCycles,
        restoreOnEnd: true,
      },
      "/admin/market-control/bulk/schedule-relative"
    );
  }
  const p = ctx.price > 0 ? ctx.price : 1;
  return ctx.post(
    {
      minutes,
      priceMin: Number((p * minRatio).toFixed(8)),
      priceMax: Number((p * maxRatio).toFixed(8)),
      waveCycles,
      restoreOnEnd: true,
    },
    `/admin/market-control/tokens/${ctx.tokenId}/schedule`
  );
}

function modelPresetRun(ctx: PresetContext, presetId: string) {
  const preset = PRICE_MODEL_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    throw new Error(`Preset ${presetId} không tồn tại`);
  }
  const body = buildModelRunBody(preset, ctx.price > 0 ? ctx.price : 1);
  if (ctx.applyTarget.mode !== "single") {
    return ctx.postBulk(
      {
        ...bulkTargetBody(ctx.applyTarget),
        modelId: preset.modelId,
        presetId,
        durationMin: preset.durationMin,
        restoreOnEnd: false,
      },
      "/admin/market-control/bulk/model-run"
    );
  }
  return ctx.post(
    body,
    `/admin/market-control/tokens/${ctx.tokenId}/model-run`
  );
}

function modelRampPreset(
  ctx: PresetContext,
  presetId: "model-pump-ramp" | "model-dump-ramp",
) {
  return modelPresetRun(ctx, presetId);
}

export const PRESET_GROUPS: { id: PresetGroup; label: string; hint: string }[] = [
  {
    id: "schedule",
    label: "Lịch giá (A → B)",
    hint: "Dao động trong khoảng thời gian, hết giờ tự về bình thường",
  },
  {
    id: "instant",
    label: "Một chạm",
    hint: "Đổi giá ngay, không cần chọn thời gian",
  },
  {
    id: "book",
    label: "Sổ lệnh MM",
    hint: "Spread & độ dày — chỉ token đang chọn",
  },
  {
    id: "system",
    label: "Hệ thống",
    hint: "Theo token hoặc toàn sàn (xem nhãn từng nút)",
  },
];

export const MARKET_PRESETS: MarketPreset[] = [
  {
    id: "sched-sideway-15",
    group: "schedule",
    scope: "token",
    title: "Sideway 15 phút",
    desc: "±3% quanh giá hiện tại · 4 sóng",
    tone: "neutral",
    disabled: (c) => c.hasSchedule || c.hasModelRun,
    run: (c) => schedule(c, 15, 0.97, 1.03, 4),
  },
  {
    id: "sched-sideway-30",
    group: "schedule",
    scope: "token",
    title: "Sideway 30 phút",
    desc: "±5% · 5 sóng",
    tone: "neutral",
    disabled: (c) => c.hasSchedule || c.hasModelRun,
    run: (c) => schedule(c, 30, 0.95, 1.05, 5),
  },
  {
    id: "sched-volatile-trend-up",
    group: "schedule",
    scope: "token",
    title: "Biến động mạnh — tăng",
    desc: "GBM xu hướng lên, lắc mạnh ~25 phút (PP2)",
    tone: "up",
    disabled: (c) => c.hasSchedule || c.hasModelRun,
    run: (c) => modelPresetRun(c, "model-volatile-trend-up"),
  },
  {
    id: "sched-volatile-trend-down",
    group: "schedule",
    scope: "token",
    title: "Biến động mạnh — giảm",
    desc: "GBM xu hướng xuống, lắc mạnh ~25 phút (PP2)",
    tone: "down",
    disabled: (c) => c.hasSchedule || c.hasModelRun,
    run: (c) => modelPresetRun(c, "model-volatile-trend-down"),
  },
  {
    id: "sched-pump-10",
    group: "schedule",
    scope: "token",
    title: "Pump nhẹ 10 phút",
    desc: "Ramp tăng ~+5% trong đúng 10 phút (linear_ramp)",
    tone: "up",
    disabled: (c) => c.hasSchedule || c.hasModelRun,
    run: (c) => modelRampPreset(c, "model-pump-ramp"),
  },
  {
    id: "sched-dump-10",
    group: "schedule",
    scope: "token",
    title: "Dump nhẹ 10 phút",
    desc: "Ramp giảm ~−5% trong đúng 10 phút (linear_ramp)",
    tone: "down",
    disabled: (c) => c.hasSchedule || c.hasModelRun,
    run: (c) => modelRampPreset(c, "model-dump-ramp"),
  },
  {
    id: "sched-volatile-20",
    group: "schedule",
    scope: "token",
    title: "Biến động 20 phút",
    desc: "±10% · 6 sóng (demo sôi)",
    tone: "warn",
    disabled: (c) => c.hasSchedule || c.hasModelRun,
    run: (c) => schedule(c, 20, 0.9, 1.1, 6),
  },
  {
    id: "sched-hour-band",
    group: "schedule",
    scope: "token",
    title: "Vùng giá 1 giờ",
    desc: "±7% · 8 sóng",
    tone: "accent",
    disabled: (c) => c.hasSchedule || c.hasModelRun,
    run: (c) => schedule(c, 60, 0.93, 1.07, 8),
  },
  {
    id: "instant-up-3",
    group: "instant",
    scope: "token",
    title: "+3% ngay",
    desc: "Đi bước giá + lấp sổ MM dọc đường (≥~2.5% biến động)",
    tone: "up",
    disabled: (c) => c.applyTarget.mode !== "single",
    run: (c) =>
      c.post(
        { direction: "up", pct: 0.03 },
        `/admin/market-control/tokens/${c.tokenId}/nudge`,
      ),
  },
  {
    id: "instant-down-3",
    group: "instant",
    scope: "token",
    title: "−3% ngay",
    desc: "Đi bước giá + lấp sổ MM dọc đường (≥~2.5% biến động)",
    tone: "down",
    disabled: (c) => c.applyTarget.mode !== "single",
    run: (c) =>
      c.post(
        { direction: "down", pct: 0.03 },
        `/admin/market-control/tokens/${c.tokenId}/nudge`,
      ),
  },
  {
    id: "instant-sync",
    group: "instant",
    scope: "token",
    title: "Căn mid = giá",
    desc: "Sổ lệnh khớp spot (một mã)",
    tone: "neutral",
    disabled: (c) => c.applyTarget.mode !== "single",
    run: (c) =>
      c.post({}, `/admin/market-control/tokens/${c.tokenId}/sync-mid`),
  },
  {
    id: "book-tight",
    group: "book",
    scope: "token",
    title: "Spread hẹp",
    desc: "0.15% mỗi bậc · 6 bậc (token này)",
    tone: "neutral",
    run: (c) => patchTokenBook(c, 0.0015, 6),
  },
  {
    id: "book-wide",
    group: "book",
    scope: "token",
    title: "Spread rộng",
    desc: "0.5% · 6 bậc (token này)",
    tone: "neutral",
    run: (c) => patchTokenBook(c, 0.005, 6),
  },
  {
    id: "book-deep",
    group: "book",
    scope: "token",
    title: "Sổ dày",
    desc: "10 bậc · spread 0.25% (token này)",
    tone: "accent",
    run: (c) => patchTokenBook(c, 0.0025, 10),
  },
  {
    id: "sys-demo-on",
    group: "system",
    scope: "global",
    title: "Chế độ demo",
    desc: "Bật MM + Flow",
    tone: "up",
    disabled: (c) => c.mmEnabled && c.flowEnabled,
    run: (c) => c.patchGlobal({ mmEnabled: true, flowEnabled: true }),
  },
  {
    id: "sys-bots-off",
    group: "system",
    scope: "global",
    title: "Tắt bot",
    desc: "MM + Flow off",
    tone: "warn",
    disabled: (c) => !c.mmEnabled && !c.flowEnabled,
    run: (c) => c.patchGlobal({ mmEnabled: false, flowEnabled: false }),
  },
  {
    id: "sys-cancel-sched",
    group: "system",
    scope: "token",
    title: "Hủy lịch giá",
    desc: "Dừng kịch bản A→B (một mã)",
    tone: "warn",
    disabled: (c) =>
      c.applyTarget.mode !== "single" || !c.hasSchedule,
    run: (c) =>
      c.post(
        {},
        `/admin/market-control/tokens/${c.tokenId}/schedule/cancel`
      ),
  },
  {
    id: "sys-cancel-paths-bulk",
    group: "system",
    scope: "token",
    title: "Hủy lịch/mô hình nhóm",
    desc: "Áp dụng cho nhóm hoặc tất cả alt đã chọn",
    tone: "warn",
    disabled: (c) => c.applyTarget.mode === "single",
    run: (c) =>
      c.postBulk(
        bulkTargetBody(c.applyTarget),
        "/admin/market-control/bulk/cancel-paths"
      ),
  },
  {
    id: "sys-reset-token",
    group: "system",
    scope: "token",
    title: "Reset token",
    desc: "Xóa override + lịch",
    tone: "warn",
    run: (c) =>
      c.post({}, `/admin/market-control/tokens/${c.tokenId}/reset`),
  },
  {
    id: "sys-pause-token",
    group: "system",
    scope: "token",
    title: "Tạm dừng MM token",
    desc: "Không treo sổ token này",
    tone: "neutral",
    run: (c) =>
      c.patchToken({ paused: true }, `/admin/market-control/tokens/${c.tokenId}`),
  },
  {
    id: "sys-refresh-book",
    group: "system",
    scope: "token",
    title: "Refresh sổ token",
    desc: "Đặt lại lệnh MM cho mã đang chọn",
    tone: "neutral",
    run: (c) =>
      c.post({}, `/admin/market-control/tokens/${c.tokenId}/refresh`),
  },
  {
    id: "sys-refresh-all",
    group: "system",
    scope: "global",
    title: "Refresh mọi sổ",
    desc: "Đặt lại lệnh MM cho tất cả alt",
    tone: "neutral",
    run: (c) => c.post({}, `/admin/market-control/refresh`),
  },
];
