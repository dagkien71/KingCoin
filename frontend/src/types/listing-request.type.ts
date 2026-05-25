export type ListingRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "live";

export interface IListingRequest {
  id: string;
  userId: string;
  name: string;
  symbol: string;
  logo?: string | null;
  decimals: number;
  totalSupply: number;
  initialPrice?: number | null;
  category: string;
  liquidityKcAmount: number;
  liquidityTokenAmount: number;
  teamTokenAmount: number;
  description?: string | null;
  status: ListingRequestStatus | string;
  listingFeeKc: number;
  rejectionReason?: string | null;
  upcomingListingId?: string | null;
  tokenId?: string | null;
  createdAt: string;
}

export const LISTING_REQUEST_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt · countdown",
  rejected: "Từ chối",
  live: "Đã lên sàn",
};

export const LISTING_REQUEST_STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300 bg-amber-500/15",
  approved: "text-sky-300 bg-sky-500/15",
  rejected: "text-kc-down bg-kc-down/10",
  live: "text-kc-up bg-kc-up/10",
};
