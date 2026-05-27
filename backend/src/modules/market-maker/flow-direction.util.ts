/** Hướng flow gần nhất theo token — MM dùng lệch sổ nhẹ. */
const lastFlowByToken = new Map<string, 'up' | 'down'>();

export function setLastFlowDirection(
  tokenId: string,
  direction: 'up' | 'down',
): void {
  lastFlowByToken.set(tokenId, direction);
}

export function getLastFlowDirection(
  tokenId: string,
): 'up' | 'down' | null {
  return lastFlowByToken.get(tokenId) ?? null;
}

export function clearLastFlowDirection(tokenId: string): void {
  lastFlowByToken.delete(tokenId);
}
