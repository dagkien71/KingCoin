import { WalletPool } from '@prisma/client';

export const WALLET_POOL_LABELS: Record<WalletPool, string> = {
  spot: 'Ví chính (Spot)',
  futures: 'Ví Futures',
  funding: 'Ví Funding',
};

export function walletPoolLabel(pool: WalletPool): string {
  return WALLET_POOL_LABELS[pool] ?? pool;
}
