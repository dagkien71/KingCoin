export type OrderbookDepthLevel = {
  price: number;
  quantity: number;
};

export type OrderbookDepth = {
  tokenId: string;
  at: number;
  bids: OrderbookDepthLevel[];
  asks: OrderbookDepthLevel[];
};
