export type MmBotKind = "mm" | "flow";

export type MmBotRow = {
  userId: string;
  email: string;
  username: string | null;
  kind: MmBotKind;
  configured: boolean;
  enabled: boolean;
  running: boolean;
  pendingOrders: number;
  kcBalance: number;
  baseTokenKinds: number;
  lastRefreshAt: number | null;
  lastRefreshOk: boolean;
  lastError: string | null;
  refreshCount: number;
};

export type MmBotsDashboard = {
  globalMmEnabled: boolean;
  globalFlowEnabled: boolean;
  envMmEnabled: boolean;
  bots: MmBotRow[];
};
