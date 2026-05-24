export type TokenRow = {
  id: string;
  name: string;
  symbol: string;
  logo?: string | null;
  price: number;
  mid: number | null;
  paused: boolean;
  schedule: PriceScheduleView | null;
  modelRun: PriceModelRunView | null;
  tokenKind?: string;
  params: { spreadStep: number; levels: number };
};

export type PriceModelRunView = {
  modelId: string;
  startAt: number;
  endAt: number;
  status: string;
  progress: number;
  currentTarget: number | null;
  isActive: boolean;
};

export type PriceScheduleView = {
  startAt: number;
  endAt: number;
  priceMin: number;
  priceMax: number;
  status: string;
  progress: number;
  currentTarget: number | null;
  isActive: boolean;
};

export type Dashboard = {
  mmEnabled: boolean;
  flowEnabled: boolean;
  envMmEnabled: boolean;
  tokens: TokenRow[];
};
