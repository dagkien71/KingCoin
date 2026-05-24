import { Order, TokenCrypto, User } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

export default class TokenEntity implements TokenCrypto {
  readonly id!: string;

  readonly name!: string;

  readonly logo!: string;

  readonly symbol!: string;

  readonly decimals!: number;

  readonly status!: string;

  readonly price!: number;

  readonly marketCap!: number;

  readonly totalSupply!: number;

  readonly circulatingSupply!: number;

  readonly launchDate!: string;

  readonly whitepaperUrl!: string;

  readonly owner!: User;

  readonly ownerId!: string;

  readonly isVerified!: boolean;

  readonly description!: string;

  readonly communityLinks!: JsonValue;

  readonly initialPrice!: number;

  readonly maxSupply!: number;

  readonly rank!: number;

  readonly follower!: number;

  readonly rating!: number;

  readonly athPrice!: number;

  readonly athPercentage!: number;

  readonly atlPrice!: number;

  readonly atlPercentage!: number;

  readonly athPriceDay!: number;

  readonly athPercentageDay!: number;

  readonly atlPriceDay!: number;

  readonly atlPercentageDay!: number;

  readonly createdAt!: Date;

  readonly updatedAt!: Date;

  readonly volumes!: JsonValue;

  readonly priceChange1h!: number | null;

  readonly priceChange24h!: number | null;

  readonly priceChange7d!: number | null;

  readonly tokenKind!: string | null;

  readonly stablecoinSpec!: JsonValue | null;

  readonly orders!: Order[];
}
