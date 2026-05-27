/** Kiểm tra spot đã chạm target (theo hướng up/down). */
export function spotReachedTarget(
  spot: number,
  targetPrice: number,
  direction: 'up' | 'down',
  epsPct: number,
): boolean {
  if (spot <= 0 || targetPrice <= 0) return false;
  const eps = Math.max(1e-9, epsPct);
  if (direction === 'up') {
    return spot >= targetPrice * (1 - eps);
  }
  return spot <= targetPrice * (1 + eps);
}
