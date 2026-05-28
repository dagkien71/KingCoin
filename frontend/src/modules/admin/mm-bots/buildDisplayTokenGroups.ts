import type { MmBotRow, TokenBotGroup } from "@/modules/admin/mm-bots/mm-bots-types";

/** Ưu tiên `tokenGroups` từ API; nếu thiếu thì gom từ `bots` theo token gán. */
export function buildDisplayTokenGroups(
  tokenGroups: TokenBotGroup[],
  bots: MmBotRow[]
): TokenBotGroup[] {
  if (tokenGroups.length > 0) return tokenGroups;

  const byToken = new Map<string, TokenBotGroup>();
  for (const bot of bots) {
    const tokenId = bot.assignedTokenId ?? "_unassigned";
    const symbol = bot.assignedTokenSymbol ?? "—";
    const tokenName = bot.assignedTokenName ?? symbol;
    let group = byToken.get(tokenId);
    if (!group) {
      group = { tokenId, tokenName, symbol, bots: [] };
      byToken.set(tokenId, group);
    }
    group.bots.push(bot);
  }

  return [...byToken.values()].sort((a, b) =>
    a.symbol.localeCompare(b.symbol, undefined, { sensitivity: "base" })
  );
}
