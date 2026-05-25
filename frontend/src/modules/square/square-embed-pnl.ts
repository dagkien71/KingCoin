import { unrealizedPnlKc, roePercent } from "@/lib/futures-math";
import type { SquarePostEmbed } from "@/types/square.type";
import type { FuturesSide } from "@/types/futures.type";

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export type SquareEmbedPnlRoi = {
  pnlKc: number;
  roiPercent: number;
};

/** PnL/ROI từ embed + giá mark live (WS); fallback snapshot trong embed. */
export function resolveSquareEmbedPnlRoi(
  kind: "order_spot" | "order_futures",
  embed: SquarePostEmbed,
  liveMark?: number | null
): SquareEmbedPnlRoi | null {
  const storedPnl = num(embed.unrealizedPnlKc);
  const storedRoi = num(embed.roiPercent);

  if (kind === "order_futures") {
    const entry = num(embed.entryPrice);
    const size = num(embed.size);
    const marginKc = num(embed.marginKc);
    const side = String(embed.side ?? "").toLowerCase() as FuturesSide;
    if (!entry || !size || !side) {
      if (storedPnl != null && storedRoi != null) {
        return { pnlKc: storedPnl, roiPercent: storedRoi };
      }
      return null;
    }
    const mark =
      liveMark != null && liveMark > 0
        ? liveMark
        : num(embed.markPrice);
    if (mark == null || mark <= 0) {
      if (storedPnl != null && storedRoi != null) {
        return { pnlKc: storedPnl, roiPercent: storedRoi };
      }
      return null;
    }
    const pnlKc = unrealizedPnlKc(side, size, entry, mark);
    const roi =
      marginKc != null && marginKc > 0
        ? roePercent(pnlKc, marginKc)
        : (storedRoi ?? 0);
    return { pnlKc, roiPercent: roi };
  }

  const price = num(embed.price);
  const openQty = num(embed.openQuantity ?? embed.quantity);
  const isBuy =
    embed.type === "buy" || String(embed.type).toLowerCase() === "buy";
  if (!price || !openQty || openQty <= 0) {
    if (storedPnl != null && storedRoi != null) {
      return { pnlKc: storedPnl, roiPercent: storedRoi };
    }
    return null;
  }
  const mark =
    liveMark != null && liveMark > 0 ? liveMark : num(embed.markPrice);
  if (mark == null || mark <= 0) {
    if (storedPnl != null && storedRoi != null) {
      return { pnlKc: storedPnl, roiPercent: storedRoi };
    }
    return null;
  }
  const pnlKc = isBuy
    ? (mark - price) * openQty
    : (price - mark) * openQty;
  const costKc = price * openQty;
  const roiPercent =
    costKc > 0 ? (pnlKc / costKc) * 100 : (storedRoi ?? 0);
  return { pnlKc, roiPercent };
}
