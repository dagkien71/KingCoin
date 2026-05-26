export type AdminUserRow = {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  /** `liquidity_bot` = MM/flow — không tính thống kê trader */
  accountTags?: string[];
  status?: string;
  dailyPnL?: number;
  weeklyPnL?: number;
  dailyPnLPercent?: number;
  weeklyPnLPercent?: number;
  createdAt?: string;
};

export type AdminUserStats = {
  navKc: number;
  quoteKc: number;
  altValueKc: number;
  openSpotOrders: number;
  completedSpotOrders: number;
  canceledSpotOrders: number;
  spotFillCount: number;
  spotVolumeKc: number;
  openFuturesPositions: number;
  futuresUnrealizedPnlKc: number;
  futuresRealizedPnlKc: number;
  futuresMarginKc: number;
};

export type AdminUserOverview = {
  user: AdminUserRow & {
    walletAddress?: string | null;
    navBaselineDayKc?: number;
    navBaselineWeekKc?: number;
  };
  stats: AdminUserStats;
  balances: {
    quoteKc: number;
    tokens: { tokenId: string; symbol: string | null; amount: number }[];
  };
  isLiquidityBot?: boolean;
};

export type AdminUserOrder = {
  id: string;
  tokenId: string;
  symbol?: string | null;
  type: string;
  price: number;
  quantity: number;
  matchedQuantity: number;
  pair: string;
  status: string;
  createdAt: string;
};

export type AdminFuturesPosition = {
  id: string;
  tokenId: string;
  symbol?: string | null;
  side: string;
  leverage: number;
  size: number;
  entryPrice: number;
  markPrice: number;
  marginKc: number;
  unrealizedPnlKc: number;
  liquidationPrice?: number | null;
};

export type AdminFuturesHistory = {
  id: string;
  tokenId: string;
  symbol?: string | null;
  side: string;
  leverage: number;
  entryPrice: number;
  exitPrice?: number | null;
  realizedPnlKc: number;
  status: string;
  openedAt: string;
  closedAt?: string | null;
};

export type AdminLedgerEntry = {
  id: string;
  amount: number;
  currency: string;
  refType: string;
  note?: string | null;
  balanceAfter: number;
  createdAt: string;
};

export type Paginated<T> = {
  data: T[];
  meta?: {
    total?: number;
    currentPage?: number;
    perPage?: number;
    lastPage?: number;
    prev?: number | null;
    next?: number | null;
  };
};
