"use client";

import { Button } from "@/components/ui/button";
import { QUOTE_SYMBOL } from "@/constants/quote";
import {
  estimateLiqPrice,
  liqDistancePct,
  parseOptionalPrice,
  sizeFromMargin,
  validateTpSlPrices,
} from "@/lib/futures-math";
import { FuturesPanelModal } from "@/modules/futures/FuturesPanelModal";
import { LiquidationEmphasis } from "@/modules/futures/LiquidationEmphasis";
import {
  feeFromNotional,
  formatFeePct,
  useTradingFees,
} from "@/hooks/useTradingFees";
import useLiveFetch from "@/hooks/useLiveFetch";
import useMutation from "@/hooks/useMutation";
import type { IBalanceSnapshot } from "@/types/trade.type";
import type { FuturesConfig, FuturesSide } from "@/types/futures.type";
import type { ITokenCrypto } from "@/types/token.type";
import {
  formatFixedPrice,
  formatTokenPrice,
} from "@/utils/format-number";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { HiOutlineAdjustments, HiOutlineInformationCircle } from "react-icons/hi";
import { toast } from "react-toastify";

const LEVERAGE_PRESETS = [2, 5, 10, 20, 50];
const MARGIN_PRESETS = [0.25, 0.5, 0.75, 1] as const;
const PRICE_DECIMALS = 4;

type Preview = {
  size: number;
  notional: number;
  liq: number;
  liqDist: number;
  marginPct: number;
  entry: number;
  openFeeKc: number;
};

type Props = {
  token: ITokenCrypto;
  config?: FuturesConfig | null;
  markPrice: number;
  onSuccess?: () => void;
};

function MetricRow({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div>
        <span className="text-xs text-kc-muted">{label}</span>
        {hint ? (
          <p className="mt-0.5 text-[10px] leading-tight text-kc-muted/70">
            {hint}
          </p>
        ) : null}
      </div>
      <span
        className={clsx(
          "num text-right text-xs font-semibold text-kc-fg",
          valueClass
        )}
      >
        {value}
      </span>
    </div>
  );
}

function OrderPreviewBody({
  preview,
  token,
  side,
  leverage,
  config,
  takeProfitPrice,
  stopLossPrice,
  openFeeKc,
  openFeeRate,
  fundingRate,
}: {
  preview: Preview;
  token: ITokenCrypto;
  side: FuturesSide;
  leverage: number;
  config?: FuturesConfig | null;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  openFeeKc?: number;
  openFeeRate?: number;
  fundingRate?: number;
}) {
  const isLong = side === "long";
  return (
    <div className="divide-y divide-kc-border/50">
      <MetricRow
        label="Hướng · đòn bẩy"
        value={`${side.toUpperCase()} · ${leverage}x`}
        valueClass={isLong ? "text-kc-up" : "text-kc-down"}
      />
      <MetricRow
        label="Khối lượng (Size)"
        value={`${formatTokenPrice(token.decimals ?? 4, preview.size)} ${token.symbol ?? ""}`}
      />
      <MetricRow
        label="Giá trị danh nghĩa"
        value={`${formatTokenPrice(2, preview.notional)} ${QUOTE_SYMBOL}`}
        hint="Margin × đòn bẩy"
      />
      <MetricRow
        label="Giá vào ước tính"
        value={`${formatFixedPrice(PRICE_DECIMALS, preview.entry)} ${QUOTE_SYMBOL}`}
        hint="Theo mark price hiện tại"
      />
      <div className="py-1">
        <LiquidationEmphasis
          price={`${formatFixedPrice(PRICE_DECIMALS, preview.liq)} ${QUOTE_SYMBOL}`}
          distancePct={preview.liqDist}
          label="Giá thanh lý ước tính"
        />
      </div>
      {config?.liquidationFeeRate != null ? (
        <MetricRow
          label="Phí thanh lý (tham khảo)"
          value={`${(config.liquidationFeeRate * 100).toFixed(2)}%`}
          valueClass="text-pink-300"
        />
      ) : null}
      {openFeeKc != null && openFeeKc > 0 ? (
        <MetricRow
          label="Phí mở lệnh"
          value={`~${formatTokenPrice(4, openFeeKc)} ${QUOTE_SYMBOL}`}
          hint={
            openFeeRate != null
              ? `${formatFeePct(openFeeRate)} notional`
              : undefined
          }
        />
      ) : null}
      {fundingRate != null && fundingRate > 0 ? (
        <MetricRow
          label="Funding (8h)"
          value={formatFeePct(fundingRate)}
          hint="Long trả · Short nhận"
        />
      ) : null}
      <MetricRow
        label="Take profit"
        value={
          takeProfitPrice != null
            ? `${formatFixedPrice(PRICE_DECIMALS, takeProfitPrice)} ${QUOTE_SYMBOL}`
            : "—"
        }
        valueClass="text-kc-up"
      />
      <MetricRow
        label="Stop loss"
        value={
          stopLossPrice != null
            ? `${formatFixedPrice(PRICE_DECIMALS, stopLossPrice)} ${QUOTE_SYMBOL}`
            : "—"
        }
        valueClass="text-kc-down"
      />
    </div>
  );
}

export function FuturesOrderPanel({
  token,
  config,
  markPrice,
  onSuccess,
}: Props) {
  const { mutate: openOrder, loading } = useMutation("POST", "/futures/orders");
  const { data: balances } = useLiveFetch<IBalanceSnapshot>(
    "/users/me/balances",
    { stream: "trades" }
  );
  const { data: feeRates } = useTradingFees(config?.liquidationFeeRate);
  const openFeeRate = feeRates?.futures.openRate ?? 0.0004;
  const closeFeeRate = feeRates?.futures.closeRate ?? 0.0004;
  const fundingRate = feeRates?.futures.fundingRate ?? 0.0001;

  const maxLev = config?.maxLeverage ?? 10;
  const levPresets = LEVERAGE_PRESETS.filter((l) => l <= maxLev);
  const defaultLev = levPresets.includes(10)
    ? 10
    : (levPresets[levPresets.length - 1] ?? maxLev);

  const [side, setSide] = useState<FuturesSide>("long");
  const [leverage, setLeverage] = useState(defaultLev);
  const [marginKc, setMarginKc] = useState("100");
  const [marginModalOpen, setMarginModalOpen] = useState(false);
  const [tpSlModalOpen, setTpSlModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [takeProfitInput, setTakeProfitInput] = useState("");
  const [stopLossInput, setStopLossInput] = useState("");

  const quoteAvailable = balances?.quoteKc ?? 0;
  const maintenanceRate = config?.maintenanceRate ?? 0.005;
  const minMargin = config?.minMarginKc ?? 0;

  const preview = useMemo((): Preview | null => {
    const m = Number(marginKc);
    if (!markPrice || !Number.isFinite(m) || m <= 0 || leverage <= 0) {
      return null;
    }
    const size = sizeFromMargin(m, leverage, markPrice);
    const notional = m * leverage;
    const liq = estimateLiqPrice(side, markPrice, leverage, maintenanceRate);
    const liqDist = liqDistancePct(side, markPrice, liq);
    const marginPct = quoteAvailable > 0 ? (m / quoteAvailable) * 100 : 0;
    const openFeeKc = feeFromNotional(notional, openFeeRate);
    return { size, notional, liq, liqDist, marginPct, entry: markPrice, openFeeKc };
  }, [
    marginKc,
    leverage,
    markPrice,
    side,
    maintenanceRate,
    quoteAvailable,
    openFeeRate,
  ]);

  const tpSlParsed = useMemo(() => {
    if (!markPrice || markPrice <= 0) {
      return { takeProfitPrice: null, stopLossPrice: null, error: undefined as string | undefined };
    }
    return validateTpSlPrices(side, markPrice, {
      takeProfitPrice: parseOptionalPrice(takeProfitInput),
      stopLossPrice: parseOptionalPrice(stopLossInput),
    });
  }, [side, markPrice, takeProfitInput, stopLossInput]);

  const applyMarginPct = (pct: number) => {
    if (quoteAvailable <= 0) return;
    const next = Math.max(0, quoteAvailable * pct);
    setMarginKc(String(Math.floor(next * 100) / 100));
  };

  const submit = async () => {
    if (!config?.enabled) {
      toast.error("Futures chưa bật cho token này.");
      return;
    }
    const m = Number(marginKc);
    if (!m || m <= 0) {
      toast.error("Nhập margin hợp lệ.");
      return;
    }
    if (minMargin > 0 && m < minMargin - 1e-9) {
      toast.error(
        `Margin tối thiểu ${formatTokenPrice(2, minMargin)} ${QUOTE_SYMBOL}.`
      );
      return;
    }
    if (m > quoteAvailable + 1e-9) {
      toast.error(
        `Không đủ ${QUOTE_SYMBOL}. Có ${formatTokenPrice(2, quoteAvailable)}.`
      );
      return;
    }
    const openFee = preview?.openFeeKc ?? feeFromNotional(m * leverage, openFeeRate);
    if (m + openFee > quoteAvailable + 1e-9) {
      toast.error(
        `Không đủ KC cho margin + phí mở (~${formatTokenPrice(4, openFee)} ${QUOTE_SYMBOL}).`
      );
      return;
    }
    if (tpSlParsed.error) {
      toast.error(tpSlParsed.error);
      return;
    }
    try {
      const res = (await openOrder({
        tokenId: token.id,
        side,
        leverage,
        marginKc: m,
        takeProfitPrice: tpSlParsed.takeProfitPrice,
        stopLossPrice: tpSlParsed.stopLossPrice,
      })) as { merged?: boolean };
      toast.success(
        res?.merged
          ? `Đã cộng thêm ${side === "long" ? "Long" : "Short"} — giá vào & size đã cập nhật`
          : `Đã mở vị thế ${side === "long" ? "Long" : "Short"}`
      );
      setConfirmOpen(false);
      onSuccess?.();
    } catch {
      /* handled */
    }
  };

  const isLong = side === "long";

  const openConfirm = () => {
    if (!preview) {
      toast.error("Nhập margin hợp lệ trước khi mở lệnh.");
      return;
    }
    if (tpSlParsed.error) {
      toast.error(tpSlParsed.error);
      return;
    }
    setConfirmOpen(true);
  };

  const tpSlSummary =
    tpSlParsed.takeProfitPrice != null || tpSlParsed.stopLossPrice != null
      ? [
          tpSlParsed.takeProfitPrice != null
            ? `TP ${formatFixedPrice(PRICE_DECIMALS, tpSlParsed.takeProfitPrice)}`
            : null,
          tpSlParsed.stopLossPrice != null
            ? `SL ${formatFixedPrice(PRICE_DECIMALS, tpSlParsed.stopLossPrice)}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "Chưa đặt (tuỳ chọn)";

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <div className="space-y-3">
          {/* Long / Short */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-kc-bg p-0.5 ring-1 ring-kc-border/60">
            <button
              type="button"
              onClick={() => setSide("long")}
              className={clsx(
                "rounded-md py-2 text-xs font-bold transition",
                isLong
                  ? "bg-kc-up text-white"
                  : "text-kc-muted hover:text-kc-fg"
              )}
            >
              Long
            </button>
            <button
              type="button"
              onClick={() => setSide("short")}
              className={clsx(
                "rounded-md py-2 text-xs font-bold transition",
                !isLong
                  ? "bg-kc-down text-white"
                  : "text-kc-muted hover:text-kc-fg"
              )}
            >
              Short
            </button>
          </div>

          {/* Leverage — một hàng chip */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] text-kc-muted">Đòn bẩy</span>
              <span className="num text-[11px] font-bold text-kc-accent">
                {leverage}x
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {levPresets.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLeverage(l)}
                  className={clsx(
                    "num flex-1 min-w-[2.25rem] rounded-md px-2 py-1.5 text-[11px] font-semibold transition",
                    leverage === l
                      ? "bg-kc-accent/20 text-kc-accent ring-1 ring-kc-accent/40"
                      : "bg-kc-bg text-kc-muted ring-1 ring-kc-border/60 hover:text-kc-fg"
                  )}
                >
                  {l}x
                </button>
              ))}
            </div>
          </div>

          {/* Margin — gọn */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="futures-margin" className="text-[11px] text-kc-muted">
                Margin ({QUOTE_SYMBOL})
              </label>
              <button
                type="button"
                onClick={() => setMarginModalOpen(true)}
                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-kc-accent hover:underline"
              >
                <HiOutlineAdjustments className="h-3 w-3" />
                % ví
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                id="futures-margin"
                type="number"
                min="0"
                step="any"
                value={marginKc}
                onChange={(e) => setMarginKc(e.target.value)}
                className="num min-w-0 flex-1 rounded-lg border border-kc-border bg-kc-bg px-2.5 py-2 text-sm font-semibold text-kc-fg outline-none focus:border-kc-accent/50"
              />
              <button
                type="button"
                onClick={() => applyMarginPct(1)}
                disabled={quoteAvailable <= 0}
                className="shrink-0 rounded-lg border border-kc-border bg-kc-bg px-2.5 text-[11px] font-semibold text-kc-muted hover:text-kc-accent disabled:opacity-40"
              >
                Max
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-kc-muted">
              Khả dụng{" "}
              <span className="num font-medium text-kc-fg">
                {formatTokenPrice(2, quoteAvailable)} {QUOTE_SYMBOL}
              </span>
            </p>
          </div>

          {/* TP / SL — modal để giữ panel gọn */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-kc-border/70 bg-kc-bg/40 px-2.5 py-2">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-kc-muted">TP / SL</p>
              <p className="num truncate text-[10px] text-kc-fg">{tpSlSummary}</p>
            </div>
            <button
              type="button"
              onClick={() => setTpSlModalOpen(true)}
              className="shrink-0 rounded-md border border-kc-border px-2 py-1 text-[10px] font-semibold text-kc-accent hover:border-kc-accent/40"
            >
              Thiết lập
            </button>
          </div>

          {/* Tóm tắt liq + chi tiết */}
          {preview ? (
            <LiquidationEmphasis
              compact
              price={`${formatFixedPrice(PRICE_DECIMALS, preview.liq)} ${QUOTE_SYMBOL}`}
              distancePct={preview.liqDist}
              label={`Liq. · size ≈ ${formatTokenPrice(token.decimals ?? 4, preview.size)} ${token.symbol ?? ""}`}
            />
          ) : null}
          {preview ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="text-[10px] font-medium text-kc-accent hover:underline"
            >
              Xem chi tiết lệnh →
            </button>
          ) : null}

          {!config?.enabled ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-200/90">
              <HiOutlineInformationCircle className="h-3.5 w-3.5 shrink-0" />
              Futures chưa bật cho token này.
            </div>
          ) : null}
        </div>

        <div className="mt-auto shrink-0 space-y-1.5 pt-3">
          <Button
            type="button"
            className={clsx(
              "h-10 w-full rounded-lg text-xs font-bold",
              isLong
                ? "bg-kc-up hover:bg-kc-up/90"
                : "bg-kc-down hover:bg-kc-down/90"
            )}
            disabled={loading || !config?.enabled || !preview}
            onClick={openConfirm}
          >
            {loading
              ? "Đang xử lý…"
              : `Mở ${isLong ? "Long" : "Short"} · ${leverage}x`}
          </Button>
        </div>
      </div>

      {/* Modal: % margin từ ví */}
      <FuturesPanelModal
        open={marginModalOpen}
        onClose={() => setMarginModalOpen(false)}
        title="Chọn margin từ ví"
        subtitle={`Khả dụng ${formatTokenPrice(2, quoteAvailable)} ${QUOTE_SYMBOL}`}
      >
        <div className="grid grid-cols-2 gap-2">
          {MARGIN_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => {
                applyMarginPct(pct);
                setMarginModalOpen(false);
              }}
              disabled={quoteAvailable <= 0}
              className="rounded-xl border border-kc-border bg-kc-bg py-3 text-sm font-semibold text-kc-fg transition hover:border-kc-accent/40 hover:text-kc-accent disabled:opacity-40"
            >
              {pct === 1 ? "100% · Max" : `${pct * 100}% ví`}
              <span className="mt-0.5 block num text-[11px] font-normal text-kc-muted">
                {formatTokenPrice(2, quoteAvailable * pct)} {QUOTE_SYMBOL}
              </span>
            </button>
          ))}
        </div>
        {preview && preview.marginPct > 0 ? (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] text-kc-muted">
              <span>Đang chọn</span>
              <span className="num">{preview.marginPct.toFixed(0)}% ví</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-kc-border/60">
              <div
                className={clsx(
                  "h-full rounded-full transition-all",
                  preview.marginPct > 90 ? "bg-kc-down" : "bg-kc-accent"
                )}
                style={{ width: `${Math.min(100, preview.marginPct)}%` }}
              />
            </div>
          </div>
        ) : null}
      </FuturesPanelModal>

      <FuturesPanelModal
        open={tpSlModalOpen}
        onClose={() => setTpSlModalOpen(false)}
        title="Take profit / Stop loss"
        subtitle={
          markPrice > 0
            ? `Mark ${formatFixedPrice(PRICE_DECIMALS, markPrice)} · ${isLong ? "Long" : "Short"}`
            : undefined
        }
        footer={
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              if (tpSlParsed.error) {
                toast.error(tpSlParsed.error);
                return;
              }
              setTpSlModalOpen(false);
            }}
          >
            Lưu TP/SL
          </Button>
        }
      >
        <p className="mb-3 text-[11px] text-kc-muted">
          {isLong
            ? "Long: TP > mark, SL < mark. Để trống nếu không dùng."
            : "Short: TP < mark, SL > mark. Để trống nếu không dùng."}
        </p>
        <div className="space-y-3">
          <div>
            <label htmlFor="futures-tp" className="mb-1 block text-xs text-kc-up">
              Take profit ({QUOTE_SYMBOL})
            </label>
            <input
              id="futures-tp"
              type="number"
              min="0"
              step="any"
              placeholder="Tuỳ chọn"
              value={takeProfitInput}
              onChange={(e) => setTakeProfitInput(e.target.value)}
              className="num w-full rounded-lg border border-kc-border bg-kc-bg px-2.5 py-2 text-sm text-kc-fg outline-none focus:border-kc-up/50"
            />
          </div>
          <div>
            <label htmlFor="futures-sl" className="mb-1 block text-xs text-kc-down">
              Stop loss ({QUOTE_SYMBOL})
            </label>
            <input
              id="futures-sl"
              type="number"
              min="0"
              step="any"
              placeholder="Tuỳ chọn"
              value={stopLossInput}
              onChange={(e) => setStopLossInput(e.target.value)}
              className="num w-full rounded-lg border border-kc-border bg-kc-bg px-2.5 py-2 text-sm text-kc-fg outline-none focus:border-kc-down/50"
            />
          </div>
        </div>
        {tpSlParsed.error ? (
          <p className="mt-2 text-[11px] text-kc-down">{tpSlParsed.error}</p>
        ) : null}
      </FuturesPanelModal>

      {/* Modal: xác nhận + chi tiết */}
      <FuturesPanelModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Xác nhận mở vị thế"
        subtitle={
          markPrice > 0
            ? `Mark ${formatFixedPrice(PRICE_DECIMALS, markPrice)} ${QUOTE_SYMBOL}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Huỷ
            </Button>
            <Button
              type="button"
              className={clsx(
                "flex-1 font-bold",
                isLong ? "bg-kc-up hover:bg-kc-up/90" : "bg-kc-down hover:bg-kc-down/90"
              )}
              disabled={loading}
              onClick={() => void submit()}
            >
              {loading ? "Đang xử lý…" : "Xác nhận mở"}
            </Button>
          </div>
        }
      >
        {preview ? (
          <>
            <OrderPreviewBody
              preview={preview}
              token={token}
              side={side}
              leverage={leverage}
              config={config}
              takeProfitPrice={tpSlParsed.takeProfitPrice}
              stopLossPrice={tpSlParsed.stopLossPrice}
              openFeeKc={preview.openFeeKc}
              openFeeRate={openFeeRate}
              fundingRate={fundingRate}
            />
            <p className="mt-3 text-[10px] leading-relaxed text-kc-muted">
              Lệnh market khớp theo mark price. Phí đóng ước tính{" "}
              {formatFeePct(closeFeeRate)} notional. Rủi ro thanh lý tăng khi đòn
              bẩy cao.
            </p>
          </>
        ) : null}
      </FuturesPanelModal>
    </>
  );
}
