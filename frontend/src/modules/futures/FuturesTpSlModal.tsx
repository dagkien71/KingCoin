"use client";

import { Button } from "@/components/ui/button";
import { QUOTE_SYMBOL } from "@/constants/quote";
import { parseOptionalPrice, validateTpSlPrices } from "@/lib/futures-math";
import { FuturesPanelModal } from "@/modules/futures/FuturesPanelModal";
import type { FuturesSide } from "@/types/futures.type";
import { formatFixedPrice } from "@/utils/format-number";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

const PRICE_DECIMALS = 4;

type Props = {
  open: boolean;
  onClose: () => void;
  side: FuturesSide;
  markPrice: number;
  initialTakeProfit?: number | null;
  initialStopLoss?: number | null;
  saving?: boolean;
  onSave: (values: {
    takeProfitPrice: number | null;
    stopLossPrice: number | null;
  }) => void | Promise<void>;
};

export function FuturesTpSlModal({
  open,
  onClose,
  side,
  markPrice,
  initialTakeProfit = null,
  initialStopLoss = null,
  saving = false,
  onSave,
}: Props) {
  const [takeProfitInput, setTakeProfitInput] = useState("");
  const [stopLossInput, setStopLossInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setTakeProfitInput(
      initialTakeProfit != null ? String(initialTakeProfit) : ""
    );
    setStopLossInput(initialStopLoss != null ? String(initialStopLoss) : "");
  }, [open, initialTakeProfit, initialStopLoss]);

  const parsed = useMemo(() => {
    if (!markPrice || markPrice <= 0) {
      return {
        takeProfitPrice: null as number | null,
        stopLossPrice: null as number | null,
        error: "Chưa có giá mark.",
      };
    }
    return validateTpSlPrices(side, markPrice, {
      takeProfitPrice: parseOptionalPrice(takeProfitInput),
      stopLossPrice: parseOptionalPrice(stopLossInput),
    });
  }, [side, markPrice, takeProfitInput, stopLossInput]);

  const isLong = side === "long";

  const handleSave = async () => {
    if (parsed.error) {
      toast.error(parsed.error);
      return;
    }
    await onSave({
      takeProfitPrice: parsed.takeProfitPrice,
      stopLossPrice: parsed.stopLossPrice,
    });
  };

  return (
    <FuturesPanelModal
      open={open}
      onClose={onClose}
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
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "Đang lưu…" : "Lưu TP/SL"}
        </Button>
      }
    >
      <p className="mb-3 text-[11px] text-kc-muted">
        {isLong
          ? "Long: TP > mark, SL < mark. Để trống để bỏ mức đó."
          : "Short: TP < mark, SL > mark. Để trống để bỏ mức đó."}
      </p>
      <div className="space-y-3">
        <div>
          <label htmlFor="position-tp" className="mb-1 block text-xs text-kc-up">
            Take profit ({QUOTE_SYMBOL})
          </label>
          <input
            id="position-tp"
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
          <label htmlFor="position-sl" className="mb-1 block text-xs text-kc-down">
            Stop loss ({QUOTE_SYMBOL})
          </label>
          <input
            id="position-sl"
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
      {parsed.error ? (
        <p className="mt-2 text-[11px] text-kc-down">{parsed.error}</p>
      ) : null}
    </FuturesPanelModal>
  );
}
