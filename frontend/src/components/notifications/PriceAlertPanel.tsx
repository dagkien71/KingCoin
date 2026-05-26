import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  createPriceAlert,
  deletePriceAlert,
  fetchPriceAlerts,
  type PriceAlertRow,
} from "@/lib/notification-api";
import { Button } from "@/components/ui/button";
import { formatTokenPrice } from "@/utils/format-number";

type Props = {
  tokenId: string;
  marketKind?: "spot" | "futures";
  currentPrice?: number | null;
  symbol?: string;
};

export default function PriceAlertPanel({
  tokenId,
  marketKind = "spot",
  currentPrice,
  symbol,
}: Props) {
  const [alerts, setAlerts] = useState<PriceAlertRow[]>([]);
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await fetchPriceAlerts(tokenId);
      setAlerts(rows.filter((a) => a.marketKind === marketKind));
    } catch {
      /* ignore */
    }
  }, [tokenId, marketKind]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    const targetPrice = Number(target);
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
      toast.error("Nhập giá mục tiêu hợp lệ (KC).");
      return;
    }
    setLoading(true);
    try {
      await createPriceAlert({
        tokenId,
        marketKind,
        direction,
        targetPrice,
      });
      toast.success("Đã tạo cảnh báo giá");
      setTarget("");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Không tạo được cảnh báo");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deletePriceAlert(id);
      await load();
    } catch {
      toast.error("Không xóa được cảnh báo");
    }
  };

  return (
    <div className="rounded-xl border border-kc-border bg-kc-surface/40 p-3 text-sm">
      <p className="font-medium text-kc-fg mb-2">
        Cảnh báo giá {symbol ? `(${symbol})` : ""}
      </p>
      {currentPrice != null && currentPrice > 0 ? (
        <p className="text-xs text-kc-muted mb-2">
          Giá hiện tại: {formatTokenPrice(4, currentPrice)} KC
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 mb-2">
        <select
          value={direction}
          onChange={(e) =>
            setDirection(e.target.value as "above" | "below")
          }
          className="rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-kc-fg"
        >
          <option value="above">≥ (trên)</option>
          <option value="below">≤ (dưới)</option>
        </select>
        <input
          type="number"
          step="any"
          min={0}
          placeholder="Giá KC"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="flex-1 min-w-[100px] rounded-lg border border-kc-border bg-kc-bg px-2 py-1.5 text-kc-fg"
        />
        <Button size="sm" variant="primary" disabled={loading} onClick={onCreate}>
          Thêm
        </Button>
      </div>
      {alerts.length > 0 ? (
        <ul className="space-y-1 text-xs">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 text-kc-muted"
            >
              <span>
                {a.direction === "above" ? "≥" : "≤"}{" "}
                {formatTokenPrice(4, a.targetPrice)} KC
              </span>
              <button
                type="button"
                className="text-red-400/90 hover:underline"
                onClick={() => void onDelete(a.id)}
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-kc-muted">Chưa có cảnh báo active.</p>
      )}
    </div>
  );
}
