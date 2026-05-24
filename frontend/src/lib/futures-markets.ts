import { QUOTE_SYMBOL } from "@/constants/quote";
import type { ITokenCrypto } from "@/types/token.type";
import { isStablecoinToken } from "@/types/token.type";

export function futuresPairLabel(token: ITokenCrypto): string {
  return `${token.symbol ?? token.name}/${QUOTE_SYMBOL}`;
}

/** Lọc danh sách spot → alt có futures (client-side dự phòng). */
export function filterSpotTokensForFutures(
  tokens: ITokenCrypto[] | null | undefined
): ITokenCrypto[] {
  return (tokens ?? []).filter((t) => !isStablecoinToken(t));
}
