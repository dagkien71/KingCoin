export type MmBotKind = "mm" | "flow";

export type MmBotRow = {
  userId: string;
  email: string;
  username: string | null;
  kind: MmBotKind;
  slot?: number;
  assignedTokenId?: string | null;
  assignedTokenName?: string | null;
  assignedTokenSymbol?: string | null;
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

export type TokenBotGroup = {
  tokenId: string;
  tokenName: string;
  symbol: string;
  bots: MmBotRow[];
};

export type MmEnvDiagnostics = {
  nodeEnv: string | null;
  marketMakerEnabledRaw: string | null;
  marketFlowEnabledRaw: string | null;
  marketMakerBotCountRaw: string | null;
  marketFlowBotCountRaw: string | null;
  marketMakerQtyRaw: string | null;
  marketMakerLevelsRaw: string | null;
  marketFlowQtyRaw: string | null;
  configuredMmEmails: string[];
  configuredFlowEmails: string[];
};

export type MmBotsDashboard = {
  dedicatedPool: boolean;
  botsPerToken: number;
  globalMmEnabled: boolean;
  globalFlowEnabled: boolean;
  envMmEnabled: boolean;
  adminOverrideMmEnabled: boolean | null;
  adminOverrideFlowEnabled: boolean | null;
  diagnostics: MmEnvDiagnostics;
  tokenGroups: TokenBotGroup[];
  bots: MmBotRow[];
};
