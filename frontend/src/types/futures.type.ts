export type FuturesSide = "long" | "short";

export type FuturesPositionView = {
  id: string;
  tokenId: string;
  symbol: string | null;
  side: FuturesSide;
  size: number;
  entryPrice: number;
  leverage: number;
  marginKc: number;
  markPrice: number;
  unrealizedPnlKc: number;
  marginRatio: number;
  liquidationPrice: number;
  takeProfitPrice: number | null;
  stopLossPrice: number | null;
  status: string;
  openedAt: string;
};

export type FuturesPositionStatus = "open" | "closed" | "liquidated";

export type ClosedPositionView = {
  id: string;
  tokenId: string;
  symbol: string | null;
  side: FuturesSide;
  leverage: number;
  entryPrice: number;
  exitPrice: number | null;
  closedSize: number | null;
  realizedPnlKc: number;
  status: FuturesPositionStatus;
  openedAt: string;
  closedAt: string | null;
  liquidatedAt: string | null;
};

export type FuturesOrderView = {
  id: string;
  positionId: string | null;
  tokenId: string;
  symbol: string | null;
  side: FuturesSide;
  type: "open_market" | "close_market";
  status: string;
  size: number;
  leverage: number | null;
  marginKc: number | null;
  filledPrice: number | null;
  filledAt: string | null;
  createdAt: string;
};

export type FuturesConfig = {
  tokenId: string;
  enabled: boolean;
  maxLeverage: number;
  minMarginKc: number;
  minSize: number;
  maintenanceRate: number;
  liquidationFeeRate: number;
  openFeeRate?: number;
  closeFeeRate?: number;
  fundingRate?: number;
};
