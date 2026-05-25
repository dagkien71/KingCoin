import { IUser } from "./user.type";
import type { IStablecoinSpec, TokenKind } from "./stablecoin.type";

export type { IStablecoinSpec, TokenKind } from "./stablecoin.type";
export { isStablecoinToken } from "./stablecoin.type";

export interface ITokenCrypto {
  id: string;
  name?: string;
  logo?: string;
  symbol?: string;
  decimals?: number;
  status?: string;
  price?: number;
  marketCap?: number;
  totalSupply?: number;
  maxSupply?: number;
  rank?: number;
  follower?: number;
  rating?: number;
  circulatingSupply?: number;
  launchDate?: string;
  whitepaperUrl?: string;
  ownerId?: string;
  owner?: IUser; // Assuming 'IUser' is the interface for User model
  isVerified?: boolean;
  description?: string;
  initialPrice?: number;
  createdAt?: Date;
  updatedAt?: Date;
  communityLinks?: ICommunityLinks; // Assuming 'ICommunityLinks' is defined elsewhere
  volumes?: TokenVolumes;
  athPrice?: number; // All-Time High Price
  athPercentage?: number; // Percentage relative to the current price
  atlPrice?: number; // All-Time Low Price
  atlPercentage?: number; // Percentage relative to the current price
  athPriceDay?: number; // All-Time High Price for today
  athPercentageDay?: number; // Percentage relative to the current price for today
  atlPriceDay?: number; // All-Time Low Price for today
  atlPercentageDay?: number; // Percentage relative to the current price for today
  /** % giá so với 1h / 24h / 7d trước — docs/PRICE_CHANGE_PCT_SPEC.md */
  priceChange1h?: number;
  priceChange24h?: number;
  priceChange7d?: number;
  tokenKind?: TokenKind | string;
  stablecoinSpec?: IStablecoinSpec;
  /** defi | gamefi | meme | … */
  category?: string | null;
}

export interface ICreateTokenCrypto {
  name: string;
  symbol: string;
  logo: string;
  decimals: number;
  totalSupply: number;
  category: string;
  liquidityTokenAmount: number;
  liquidityKcAmount: number;
  teamTokenAmount: number;
  whitepaperUrl?: string;
  description?: string;
  communityLinks?: ICommunityLinks;
}

export interface ICommunityLinks {
  website?: string;
  telegram?: string;
  discord?: string;
  twitter?: string;
}

export interface ITokenCryptoLog {
  id: string;
  tokenId: string;
  price: number;
  volume: number;
  timestamp: Date;
  hash: string;
}

export interface TokenVolumes {
  volume1h: number;
  volume24h: number;
  volume1w: number;
  volume1m: number;
  volume1y: number;
}
