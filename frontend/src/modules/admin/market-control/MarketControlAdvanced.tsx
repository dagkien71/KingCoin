"use client";

import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { AdminSection } from "@/modules/admin/AdminSection";
import { Field, toLocalDatetimeValue } from "./market-control-utils";
import type { MarketControlState } from "./useMarketControl";

type Props = { mc: MarketControlState };

export function MarketControlAdvanced({ mc }: Props) {
  const {
    showAdvanced,
    setShowAdvanced,
    controlMethod,
    selected,
    tokenId,
    schedStart,
    setSchedStart,
    schedEnd,
    setSchedEnd,
    schedMin,
    setSchedMin,
    schedMax,
    setSchedMax,
    schedWaves,
    setSchedWaves,
    setPriceInput,
    setSetPriceInput,
    spreadToken,
    setSpreadToken,
    levelsToken,
    setLevelsToken,
    spreadGlobal,
    setSpreadGlobal,
    levelsGlobal,
    setLevelsGlobal,
    run,
    postAction,
    patchGlobal,
    patchToken,
  } = mc;

  return (
    <div className="rounded-xl border border-violet-500/15 bg-[#0c0a14]/60">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        Tùy chỉnh nâng cao
        <span className="text-kc-muted">{showAdvanced ? "▲" : "▼"}</span>
      </button>

      {showAdvanced && selected && (
        <div className="space-y-4 border-t border-kc-border px-4 pb-4 pt-2">
          <p className="text-xs text-kc-muted">
            Lịch tự do, đặt giá tức thì, spread/levels — dùng khi gói combo chưa đủ.
          </p>

          {controlMethod === "pp1" && !selected.schedule && !selected.modelRun?.isActive ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bắt đầu (A)">
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                  value={schedStart}
                  onChange={(e) => setSchedStart(e.target.value)}
                />
              </Field>
              <Field label="Kết thúc (B)">
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                  value={schedEnd}
                  onChange={(e) => setSchedEnd(e.target.value)}
                />
              </Field>
              <Field label="Giá min">
                <input
                  className="mt-1 w-full rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                  value={schedMin}
                  onChange={(e) => setSchedMin(e.target.value)}
                />
              </Field>
              <Field label="Giá max">
                <input
                  className="mt-1 w-full rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                  value={schedMax}
                  onChange={(e) => setSchedMax(e.target.value)}
                />
              </Field>
              <Field label="Số sóng">
                <input
                  className="mt-1 w-24 rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                  value={schedWaves}
                  onChange={(e) => setSchedWaves(e.target.value)}
                />
              </Field>
              <div className="flex items-end gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (!schedStart || !schedEnd || !schedMin || !schedMax) {
                      toast.error("Điền đủ A, B, min, max");
                      return;
                    }
                    const priceMin = Number(schedMin);
                    const priceMax = Number(schedMax);
                    if (priceMin >= priceMax) {
                      toast.error("min < max");
                      return;
                    }
                    void run(
                      () =>
                        postAction(
                          {
                            startAt: new Date(schedStart).toISOString(),
                            endAt: new Date(schedEnd).toISOString(),
                            priceMin,
                            priceMax,
                            waveCycles: Number(schedWaves) || 4,
                            restoreOnEnd: true,
                          },
                          `/admin/market-control/tokens/${tokenId}/schedule`
                        ),
                      "Đã tạo lịch"
                    );
                  }}
                >
                  Tạo lịch tùy chỉnh
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const p = selected.price || 1;
                    setSchedStart(toLocalDatetimeValue(now));
                    setSchedEnd(
                      toLocalDatetimeValue(
                        new Date(now.getTime() + 10 * 60_000)
                      )
                    );
                    setSchedMin(String(Number((p * 0.98).toFixed(6))));
                    setSchedMax(String(Number((p * 1.02).toFixed(6))));
                  }}
                >
                  Điền mẫu 10p ±2%
                </Button>
              </div>
            </div>
          ) : controlMethod === "pp1" ? (
            <p className="text-sm text-kc-muted">
              Đang có lịch/mô hình — hủy trước khi tạo lịch mới.
            </p>
          ) : null}

          <div className="flex flex-wrap items-end gap-2">
            <Field label="Đặt giá spot ngay">
              <input
                className="mt-1 w-36 rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                value={setPriceInput}
                onChange={(e) => setSetPriceInput(e.target.value)}
                placeholder={String(selected.price)}
              />
            </Field>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const p = Number(setPriceInput);
                if (!p || p <= 0) {
                  toast.error("Giá không hợp lệ");
                  return;
                }
                void run(
                  () =>
                    postAction(
                      { price: p, logVolume: 1 },
                      `/admin/market-control/tokens/${tokenId}/set-price`
                    ),
                  "Đã đặt giá"
                );
              }}
            >
              Áp dụng
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Spread — ${selected.symbol}`}>
              <input
                className="mt-1 w-full rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                placeholder={String(selected.params.spreadStep)}
                value={spreadToken}
                onChange={(e) => setSpreadToken(e.target.value)}
              />
            </Field>
            <Field label={`Levels — ${selected.symbol}`}>
              <input
                className="mt-1 w-full rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                placeholder={String(selected.params.levels)}
                value={levelsToken}
                onChange={(e) => setLevelsToken(e.target.value)}
              />
            </Field>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const body: Record<string, number> = {};
              if (spreadToken) body.spreadStep = Number(spreadToken);
              if (levelsToken) body.levels = Number(levelsToken);
              void run(
                async () => {
                  await patchToken(
                    body,
                    `/admin/market-control/tokens/${tokenId}`
                  );
                  await postAction(
                    {},
                    `/admin/market-control/tokens/${tokenId}/refresh`
                  );
                },
                `Đã lưu spread/levels cho ${selected.symbol}`
              );
            }}
          >
            Lưu spread / levels (token)
          </Button>

          <p className="text-xs text-kc-muted">
            Mặc định toàn sàn (mọi token không có override riêng):
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Spread global">
              <input
                className="mt-1 w-full rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                placeholder="0.0025"
                value={spreadGlobal}
                onChange={(e) => setSpreadGlobal(e.target.value)}
              />
            </Field>
            <Field label="Levels global">
              <input
                className="mt-1 w-full rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-sm"
                placeholder="6"
                value={levelsGlobal}
                onChange={(e) => setLevelsGlobal(e.target.value)}
              />
            </Field>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const body: Record<string, number> = {};
              if (spreadGlobal) body.spreadStep = Number(spreadGlobal);
              if (levelsGlobal) body.levels = Number(levelsGlobal);
              void run(() => patchGlobal(body), "Đã lưu mặc định toàn sàn");
            }}
          >
            Lưu spread / levels (toàn sàn)
          </Button>
        </div>
      )}
    </div>
  );
}
