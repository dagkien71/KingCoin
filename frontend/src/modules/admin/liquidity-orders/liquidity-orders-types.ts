export type LiquidityBotRole = "mm" | "flow" | "user_bot";

export type LiquidityBotRow = {
  userId: string;
  email: string;
  username: string | null;
  role: LiquidityBotRole;
  configured: boolean;
};

export type LiquidityPendingOrderRow = {
  id: string;
  userId: string;
  botEmail: string;
  botRole: LiquidityBotRole;
  tokenId: string;
  symbol: string;
  pair: string;
  type: "buy" | "sell";
  price: number;
  quantity: number;
  matchedQuantity: number;
  remaining: number;
  notionalKc: number;
  createdAt: string;
};

export type LiquidityFillRow = {
  id: string;
  tokenId: string;
  symbol: string;
  pair: string;
  price: number;
  quantity: number;
  notionalKc: number;
  buyerId: string;
  sellerId: string;
  buyerEmail: string;
  sellerEmail: string;
  buyerRole: LiquidityBotRole | null;
  sellerRole: LiquidityBotRole | null;
  takerSide: "buy" | "sell" | null;
  takerRole: LiquidityBotRole | null;
  createdAt: string;
};

export type LiquidityOrdersMonitor = {
  at: number;
  summary: {
    pendingTotal: number;
    pendingMm: number;
    pendingFlow: number;
    pendingUserBot: number;
    fillsShown: number;
    fillsVolumeKc: number;
  };
  bots: LiquidityBotRow[];
  pendingOrders: LiquidityPendingOrderRow[];
  fills: LiquidityFillRow[];
  tokens: { id: string; symbol: string }[];
};
