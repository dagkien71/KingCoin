export interface ITradeFill {
  id: string;
  tokenId: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  quantity: number;
  createdAt: string;
}

export type WalletPoolId = "spot" | "futures" | "funding";

export interface IBalanceSnapshot {
  quoteKc: number;
  spotKc?: number;
  futuresKc?: number;
  fundingKc?: number;
  walletCode?: string | null;
  tokens: { tokenId: string; symbol: string | null; amount: number }[];
}

export interface IWalletTransfer {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  fromWallet: WalletPoolId;
  toWallet: WalletPoolId;
  fromCode?: string | null;
  toCode?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface ILedgerEntry {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  tokenId?: string | null;
  refType: string;
  refId?: string | null;
  balanceAfter?: number | null;
  note?: string | null;
  createdAt: string;
}

export type QuestCategory =
  | "onboarding"
  | "daily"
  | "growth"
  | "social"
  | "creator";

export type QuestVerifyMode =
  | "auto"
  | "delayed_honor"
  | "external_then_claim"
  | "admin";

export interface IQuest {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  rewardKc: number;
  type: string;
  category?: QuestCategory | string;
  sortOrder?: number;
  ctaLabel?: string | null;
  externalUrl?: string | null;
  icon?: string | null;
  verifyMode?: QuestVerifyMode | string;
  active: boolean;
  completed: boolean;
  lastCompletedAt?: string | null;
  eligible?: boolean;
  eligibleReason?: string | null;
  progress?: { current: number; target: number } | null;
  cooldownEndsAt?: string | null;
  engageStartedAt?: string | null;
  canClaimAt?: string | null;
}

export interface IReferralStats {
  code: string;
  link: string;
  totalReferees: number;
  qualifiedReferees: number;
}
